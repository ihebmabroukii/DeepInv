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
        id=f"inc-TEST-{int(datetime.now().timestamp())}",
        source_ip="99.99.99.99",
        alerts=[
            NormalizedAlert(
                alert_id="test-alert-1",
                timestamp=datetime.now(timezone.utc),
                source_system="manual_test",
                name="Simulated Cobalt Strike Beacon",
                severity=SeverityEnum.CRITICAL
            )
        ],
        created_at=datetime.now(timezone.utc),
        status="closed",
        risk_score=99,
        narrative="[TEST] This incident simulates a confirmed positive from OpenCTI. The AI has correlated the traffic with known C2 infrastructure.",
        mitre_tactic="Command and Control",
        attack_stage="Actions on Objectives",
        threat_intel_indicators=["Cobalt-Strike", "APT29-Tool", "Malicious-SSL"]
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
