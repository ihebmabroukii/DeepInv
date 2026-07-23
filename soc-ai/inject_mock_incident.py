import asyncio
import os
from datetime import datetime, timezone
from app.schemas.alert import Incident, NormalizedAlert, SeverityEnum
from app.services.aggregator import aggregator

# Ensure Env Vars are set (if running manually inside container)
if not os.getenv("REDIS_URL"):
    os.environ["REDIS_URL"] = "redis://redis:6379/0"

async def main():
    print("💉 Injecting MOCK Incident with Threat Intel...")
    
    incident = Incident(
        id=f"inc-BF-{int(datetime.now().timestamp())}",
        source_ip="172.126.230.141",
        alerts=[
            NormalizedAlert(
                alert_id="test-alert-bf-1",
                timestamp=datetime.now(timezone.utc),
                source_system="wazuh",
                name="SSHD Authentication Success after Brute Force",
                severity=SeverityEnum.CRITICAL,
                src_ip="172.126.230.141",
                description="Accepted password for user root from 172.126.230.141 port 50010 ssh2"
            )
        ],
        created_at=datetime.now(timezone.utc),
        status="analyzed",
        risk_score=95,
        narrative="The attacker at 172.126.230.141 performed an automated SSH dictionary attack targeting the 'admin' and 'root' accounts. After 10 failed attempts, they successfully authenticated as 'root', indicating a total system compromise.",
        rca="Weak SSH password policies and lack of network rate-limiting allowed the adversary to rapidly guess credentials until successful.",
        ai_reasoning="Risk score set to 95 (CRITICAL) because a brute force attack successfully resulted in a root-level login, representing an immediate threat of lateral movement and data exfiltration.",
        ai_recommendations="1. Terminate the active SSH session for user 'root' from 172.126.230.141.\n2. Isolate the compromised host from the network.\n3. Reset all root credentials immediately.\n4. Implement Fail2Ban or strict rate-limiting on SSH port 22.",
        predicted_next_steps="The attacker will likely deploy persistence mechanisms (like adding authorized_keys) or attempt to pivot into deeper network segments.",
        mitre_tactic="Credential Access",
        attack_stage="Exploitation",
        cves_exploited=["CVE-2023-38408 (Potential OpenSSH Agent Forwarding)"],
        exact_mitre_ttps=["T1110 (Brute Force)", "T1078 (Valid Accounts)"],
        threat_intel={"opencti": ["IP flagged for Malicious SSH Scanning"], "cortex": [], "thehive": []}
    )
    
    # Save (pushes to Redis history)
    await aggregator.save_incident(incident)
    
    # We also need to manually trigger the broadcast (since save_incident usually does it, 
    # but we need to ensure the event loop is running the websocket manager properly).
    # actually save_incident calls manager.broadcast.
    
    print(f"✅ Injected Incident {incident.id} for IP {incident.source_ip}")
    print("Check the Dashboard now!")

if __name__ == "__main__":
    asyncio.run(main())
