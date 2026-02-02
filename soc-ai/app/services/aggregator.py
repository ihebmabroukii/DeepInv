from datetime import datetime, timedelta, timezone
from typing import List, Dict
from loguru import logger
import redis.asyncio as redis
from app.core.config import settings
from app.schemas.alert import NormalizedAlert, Incident
from app.api.ws import manager
import json

class AggregatorService:
    def __init__(self):
        # Redis Connection
        self.redis = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        self.window_seconds = 60  # Group alerts every 60 seconds
        self.min_alerts_for_incident = 2 # Minimum alerts to trigger analysis
        
    async def ingest(self, alert: NormalizedAlert):
        """
        Adds an alert to the aggregation buffer.
        Keyed by Source IP to group related activities.
        """
        try:
            # Check Ignore List (Global Filter)
            if alert.src_ip:
                for ignored in settings.IGNORED_IPS:
                    if alert.src_ip == ignored or alert.src_ip.startswith(ignored + "."):
                        logger.debug(f"Ignored alert from {alert.src_ip}")
                        return

            # Group by Source IP (or 'global' if unknown)
            group_key = f"alerts:{alert.src_ip or 'unknown_source'}"
            
            # Add to list
            await self.redis.rpush(group_key, alert.model_dump_json())
            
            # Set expiry (short-term memory window)
            await self.redis.expire(group_key, self.window_seconds * 2)
            
            logger.debug(f"Buffered alert from {alert.src_ip} in {group_key}")
            
        except Exception as e:
            logger.error(f"Aggregation Failed: {e}")

    async def get_pending_incidents(self) -> List[Incident]:
        """
        Scans Redis for alert groups that are ready for analysis.
        This should be called periodically (e.g., every 30s).
        """
        incidents = []
        try:
            # Find all active alert keys
            keys = await self.redis.keys("alerts:*")
            
            for key in keys:
                # Count alerts
                count = await self.redis.llen(key)
                
                # If enough evidence, bundle it!
                if count >= self.min_alerts_for_incident:
                    raw_alerts = await self.redis.lrange(key, 0, -1)
                    alerts = [NormalizedAlert.model_validate_json(a) for a in raw_alerts]
                    
                    # Create Incident
                    source_ip = key.split(":")[1]
                    incident = Incident(
                        id=f"inc-{datetime.now().timestamp()}",
                        source_ip=source_ip,
                        alerts=alerts,
                        created_at=datetime.now(timezone.utc)
                    )
                    incidents.append(incident)
                    
                    # Clear processed alerts from Redis (Consuming the buffer)
                    await self.redis.delete(key)
            return incidents
            
        except Exception as e:
            logger.error(f"Failed to fetch incidents: {e}")
            return []

    async def get_recent_history(self) -> List[Incident]:
        """
        Retrieves the last 50 analyzed incidents from Redis history.
        Sorted by Risk Score (Desc) -> Time (Desc).
        """
        try:
            # We assume Ingestor moves analyzed incidents to "incidents:history" list
            raw_data = await self.redis.lrange("incidents:history", 0, 49)
            incidents = [Incident.model_validate_json(x) for x in raw_data]
            
            # Sort: High Risk First, then Newest First
            incidents.sort(key=lambda x: (-x.risk_score, -x.created_at.timestamp()))
            
            return incidents
        except Exception:
            return []

    async def save_incident(self, incident: Incident):
        """
        Saves a completed/analyzed incident to the history list AND context.
        """
        try:
            # Push to front of history
            await self.redis.lpush("incidents:history", incident.model_dump_json())
            # Trim to keep only last 50
            await self.redis.ltrim("incidents:history", 0, 49)
            
            # Save explicit context for this IP (Stateful Memory)
            context_key = f"context:{incident.source_ip}"
            context_data = {
                "last_incident_id": incident.id,
                "timestamp": incident.created_at.isoformat(),
                "risk_score": incident.risk_score,
                "narrative": incident.narrative,
                "mitre_tactic": incident.mitre_tactic
            }
            await self.redis.set(context_key, json.dumps(context_data))
            # Context expires after 24 hours (if no new alerts)
            await self.redis.expire(context_key, 86400) 
            
            # Broadcast to Dashboard (Real-time)
            await manager.broadcast(incident.model_dump_json())
            
        except Exception as e:
            logger.error(f"Failed to save incident: {e}")

    async def get_context(self, ip: str) -> Dict:
        """
        Retrieve the last analyzed context for an IP.
        """
        try:
            context_key = f"context:{ip}"
            data = await self.redis.get(context_key)
            if data:
                return json.loads(data)
        except Exception:
            return None
        return None

aggregator = AggregatorService()
