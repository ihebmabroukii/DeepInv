import asyncio
import os
import random
from datetime import datetime, timedelta
import redis.asyncio as redis
from app.schemas.alert import NormalizedAlert, SeverityEnum
from app.services.ueba import ueba_service
from app.services.aggregator import aggregator

async def generate_dynamic_baseline():
    print("Starting Dynamic UEBA Baseline Generation...")
    
    user = "john.admin"
    normal_src_ips = ["10.0.1.45"]
    normal_dst_ips = ["10.0.50.10", "10.0.50.11"]
    normal_hosts = ["db-core-prod", "fileshare-01"]
    normal_processes = ["chrome.exe", "ssms.exe", "powershell.exe"]
    
    # 1. Generate 3 days of "normal" traffic
    now = datetime.now()
    print(f"Simulating 3 days of normal activity for {user}...")
    
    for day_offset in range(3, 0, -1):
        for _ in range(5): # 5 events per day
            event_time = now - timedelta(days=day_offset, hours=random.randint(0, 8))
            
            alert = NormalizedAlert(
                alert_id=f"base-{event_time.timestamp()}",
                timestamp=event_time,
                source_system="wazuh",
                name="Successful Logon",
                severity=SeverityEnum.LOW,
                user=user,
                src_ip=random.choice(normal_src_ips),
                dst_ip=random.choice(normal_dst_ips),
                hostname=random.choice(normal_hosts),
                process_name=random.choice(normal_processes)
            )
            
            # Directly update the UEBA profile in Redis
            await ueba_service.update_profile(alert)
            
    print(f"Baseline established in Redis for '{user}'.")
    
    # 2. Trigger an Anomaly Incident to invoke the AI
    print(f"Injecting Anomaly Incident for {user} to trigger AI Analysis...")
    
    # Malicious Alert 1 (Weird IP, weird process, weird target)
    malicious_alert_1 = NormalizedAlert(
        alert_id=f"mal-1-{now.timestamp()}",
        timestamp=now,
        source_system="wazuh",
        name="Suspicious Process Execution",
        description=f"User {user} executed unknown binary.",
        severity=SeverityEnum.HIGH,
        user=user,
        src_ip="185.15.20.100", # New external IP
        dst_ip="10.0.99.99", # Never seen before
        hostname="domain-controller", # Never seen before
        process_name="mimikatz.exe", # New process
        mitre_technique_id="T1003",
        mitre_technique_name="OS Credential Dumping"
    )
    
    # Malicious Alert 2 (To hit incident threshold)
    malicious_alert_2 = malicious_alert_1.model_copy()
    malicious_alert_2.alert_id = f"mal-2-{now.timestamp()}"
    malicious_alert_2.name = "Multiple Failed Logins following execution"
    malicious_alert_2.severity = SeverityEnum.CRITICAL
    
    # Push to Aggregator buffer to trigger AI
    # We must ensure the Aggregator recognizes it. Aggregator groups by IP normally, 
    # but we can just use the ingest method to ensure proper indexing.
    await aggregator.ingest(malicious_alert_1)
    await aggregator.ingest(malicious_alert_2)
    
    print("Simulation Complete. The AI engine should pick this up in ~5 seconds.")
    print("Check the frontend dashboard to see the Blast Radius mapping in the incident report!")

if __name__ == "__main__":
    asyncio.run(generate_dynamic_baseline())
