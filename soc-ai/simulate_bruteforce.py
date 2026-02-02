import asyncio
import os
import redis.asyncio as redis
from datetime import datetime, timedelta, timezone
from app.schemas.alert import NormalizedAlert, SeverityEnum

# Connect to Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

async def inject_bruteforce(ip: str):
    print(f"🔥 Simulating SSH Brute Force from {ip}...")
    
    r = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    group_key = f"alerts:{ip}"
    
    # 1. 10x Failed Logins
    for i in range(10):
        alert = NormalizedAlert(
            alert_id=f"alert-bf-{i}-{int(datetime.now().timestamp())}",
            timestamp=datetime.now(timezone.utc),
            source_system="wazuh",
            name="SSHD Authentication Failed",
            description=f"Failed password for invalid user admin from {ip} port {50000+i} ssh2",
            severity=SeverityEnum.MEDIUM,
            src_ip=ip,
            mitre_technique_id="T1110",
            mitre_technique_name="Brute Force"
        )
        await r.rpush(group_key, alert.model_dump_json())
        print(f"  -> Generated Alert: {alert.name}")
        
    # 2. 1x Success (To make it scary)
    success_alert = NormalizedAlert(
        alert_id=f"alert-success-{int(datetime.now().timestamp())}",
        timestamp=datetime.now(timezone.utc) + timedelta(seconds=2),
        source_system="wazuh",
        name="SSHD Authentication Success",
        description=f"Accepted password for user root from {ip} port 50010 ssh2",
        severity=SeverityEnum.CRITICAL,
        src_ip=ip,
        mitre_technique_id="T1078",
        mitre_technique_name="Valid Accounts"
    )
    await r.rpush(group_key, success_alert.model_dump_json())
    print(f"  -> Generated Alert: {success_alert.name} (CRITICAL)")

    # 3. Set expiry to ensure Ingestor picks it up
    await r.expire(group_key, 300)
    print(f"✅ Injection Complete. Aggregator will pick up in <60s.")

if __name__ == "__main__":
    import sys
    # User's IP: 172.126.230.141
    target_ip = sys.argv[1] if len(sys.argv) > 1 else "172.126.230.141"
    asyncio.run(inject_bruteforce(target_ip))
