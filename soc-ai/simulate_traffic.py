import asyncio
import os
import json
import redis.asyncio as redis
from datetime import datetime
from app.schemas.alert import NormalizedAlert, SeverityEnum

# Target Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

async def inject_alert(ip: str):
    print(f"🧨 Injecting Alert for IP: {ip}...")
    
    r = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    
    # Create Alert
    alert = NormalizedAlert(
        alert_id=f"sim-{datetime.now().timestamp()}",
        timestamp=datetime.now(),
        source_system="simulated_traffic_generator",
        name="Suspicious Traffic Detection",
        description="Simulated alert to trigger OpenCTI lookup.",
        severity=SeverityEnum.HIGH,
        src_ip=ip,
        mitre_technique_id="T1071",
        mitre_technique_name="Application Layer Protocol"
    )
    
    # Push to Ingestion Buffer (Aggregator's key)
    # Note: Aggregator expects alerts in 'alerts:{ip}'
    # But usually Ingestor puts them there. 
    # Let's mimic Ingestor by pushing directly to the Redis list aggregator reads?
    # Actually Aggregator.ingest() does `rpush alerts:{ip}`.
    
    group_key = f"alerts:{alert.src_ip}"
    await r.rpush(group_key, alert.model_dump_json())
    await r.expire(group_key, 300) # 300s window (5 mins)
    
    # Also push a 2nd alert to hit the "min_alerts_for_incident" threshold (which is 2)
    alert2 = alert.model_copy()
    alert2.alert_id = f"sim-2-{datetime.now().timestamp()}"
    alert2.name = "Repeated Connection Attempt"
    
    await r.rpush(group_key, alert2.model_dump_json())
    
    print(f"✅ Pushed 2 alerts to {group_key}. The Aggregator should pick this up in ~30-60s.")

if __name__ == "__main__":
    import sys
    target_ip = sys.argv[1] if len(sys.argv) > 1 else "8.8.8.8"
    asyncio.run(inject_alert(target_ip))
