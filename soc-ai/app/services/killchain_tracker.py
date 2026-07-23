from loguru import logger
import redis.asyncio as redis
from typing import List, Optional
from app.core.config import settings
from app.schemas.alert import NormalizedAlert

class KillChainTracker:
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

    async def register_phase(self, alert: NormalizedAlert) -> bool:
        """
        Records the MITRE phase of an alert against the victim (dst_ip) or host.
        Returns True if this alert triggered a NEW phase for this victim.
        """
        if not alert.mitre_phase:
            return False

        # Determine the victim
        victim = alert.dst_ip or alert.hostname
        if not victim:
            return False

        try:
            key = f"killchain:victim:{victim}:phases"
            
            # Check if we already saw this phase for this victim
            already_seen = await self.redis.sismember(key, str(alert.mitre_phase))
            
            if not already_seen:
                # New phase!
                await self.redis.sadd(key, str(alert.mitre_phase))
                await self.redis.expire(key, 3600 * 24 * 7) # 7 day window
                
                # Record source diversity (Wazuh vs Suricata)
                await self.redis.sadd(f"killchain:victim:{victim}:sources", alert.source_system)
                await self.redis.expire(f"killchain:victim:{victim}:sources", 3600 * 24 * 7)
                
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"KillChain tracking error: {e}")
            return False

    async def get_victim_phases(self, victim: str) -> List[int]:
        """Returns the distinct MITRE phases observed against this victim."""
        try:
            phases = await self.redis.smembers(f"killchain:victim:{victim}:phases")
            return sorted([int(p) for p in phases])
        except Exception:
            return []

    async def has_cross_source_coverage(self, victim: str) -> bool:
        """Returns True if the victim has alerts from both endpoint (wazuh) and network (suricata)."""
        try:
            sources = await self.redis.smembers(f"killchain:victim:{victim}:sources")
            has_network = any(s in sources for s in ["suricata", "security_onion", "zeek"])
            has_endpoint = any(s in sources for s in ["wazuh", "ossec", "endpoint"])
            return has_network and has_endpoint
        except Exception:
            return False

killchain_tracker = KillChainTracker()
