from loguru import logger
import redis.asyncio as redis
from typing import Optional, List
import uuid
from app.core.config import settings
from app.schemas.alert import NormalizedAlert

class CampaignCorrelator:
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

    def _get_subnet(self, ip: str) -> str:
        """Extracts the /24 subnet from an IP address."""
        if not ip or ":" in ip:  # Basic IPv6 skip for now
            return ""
        parts = ip.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.{parts[2]}"
        return ""

    async def check_campaign(self, alert: NormalizedAlert) -> Optional[str]:
        """
        Determines if an alert belongs to an existing campaign.
        Returns the campaign_id if a match is found, otherwise None.
        """
        if not alert.src_ip:
            return None
            
        try:
            # 1. Check Subnet Campaign
            subnet = self._get_subnet(alert.src_ip)
            if subnet:
                subnet_campaigns = await self.redis.smembers(f"campaign:subnet:{subnet}")
                for cid in subnet_campaigns:
                    # Require at least 2 distinct IPs in a subnet to form a reliable campaign, 
                    # but here we just append to an existing one if it exists.
                    # The creation logic handles the threshold.
                    return cid

            # 2. Check Pivot (was destination, now source)
            # If the source IP of this alert was recently a victim (dst_ip), it's a pivot campaign.
            pivot_campaigns = await self.redis.smembers(f"campaign:victim:{alert.src_ip}")
            for cid in pivot_campaigns:
                return cid

        except Exception as e:
            logger.error(f"Campaign Correlator error: {e}")
            
        return None

    async def register_alert_for_campaigns(self, alert: NormalizedAlert, incident_id: str):
        """
        Records alert details to help build future campaigns.
        """
        try:
            pipeline = self.redis.pipeline()
            
            # Record subnet activity
            if alert.src_ip:
                subnet = self._get_subnet(alert.src_ip)
                if subnet:
                    # Keep track of recent IPs in this subnet
                    key = f"recent:subnet:{subnet}"
                    pipeline.sadd(key, alert.src_ip)
                    pipeline.expire(key, 3600 * 24) # 24 hour rolling window
                    
                    # If we have 2 or more IPs in this subnet attacking, link them!
                    ip_count = await self.redis.scard(key)
                    if ip_count >= 2:
                        # Establish a campaign!
                        pipeline.sadd(f"campaign:subnet:{subnet}", incident_id)
                        
            # Record victims to detect pivots
            if alert.dst_ip:
                key = f"recent:victim:{alert.dst_ip}"
                pipeline.sadd(key, alert.src_ip) # Track who attacked this victim
                pipeline.expire(key, 3600 * 24)
                pipeline.sadd(f"campaign:victim:{alert.dst_ip}", incident_id)

            await pipeline.execute()
        except Exception as e:
            logger.error(f"Campaign registration error: {e}")

campaign_correlator = CampaignCorrelator()
