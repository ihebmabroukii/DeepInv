import asyncio
from datetime import datetime, timezone
from app.schemas.alert import Incident, NormalizedAlert, SeverityEnum
from app.services.llm_engine import llm_engine

async def run_test():
    print("Testing LLMEngine RCA Generation...")
    
    # 1. Create Mock Alert
    alert = NormalizedAlert(
        alert_id="test-1",
        timestamp=datetime.now(timezone.utc),
        source_system="wazuh",
        name="Suspicious Process Creation (whoami)",
        severity=SeverityEnum.HIGH,
        src_ip="10.0.0.100",
        user="www-data",
        process_name="whoami",
        description="The web server user ran whoami indicating possible RCE."
    )
    
    # 2. Create Mock Incident
    incident = Incident(
        id="inc-rca-test",
        source_ip="10.0.0.100",
        alerts=[alert],
        created_at=datetime.now(timezone.utc)
    )
    
    # 3. Analyze
    analyzed_incident = await llm_engine.analyze_incident(
        incident=incident, 
        previous_context=None, 
        intel_context="IP 10.0.0.100 is known for Exploit Attempts."
    )
    
    print("\n=== AI Analysis Results ===")
    print(f"Narrative: {analyzed_incident.narrative[:100]}...")
    print(f"Risk Score: {analyzed_incident.risk_score}")
    print(f"RCA: {analyzed_incident.rca}")
    print("===========================")

if __name__ == "__main__":
    asyncio.run(run_test())
