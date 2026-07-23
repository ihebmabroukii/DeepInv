import asyncio
from datetime import datetime, timezone
from app.schemas.alert import NormalizedAlert, Incident
from app.services.llm_engine import LLMEngine

async def main():
    engine = LLMEngine()
    alert = NormalizedAlert(
        alert_id="test-1",
        timestamp=datetime.now(),
        source_system="wazuh",
        name="Suspicious execution",
        severity="high",
        user="john.admin",
        src_ip="185.15.20.100",
        dst_ip="10.0.99.99",
        hostname="domain-controller",
        process_name="mimikatz.exe"
    )
    
    incident = Incident(
        id="test-inc",
        source_ip="185.15.20.100",
        alerts=[alert],
        created_at=datetime.now(timezone.utc)
    )
    
    try:
        print("Starting analysis...")
        analyzed = await engine.analyze_incident(incident)
        print("Success!")
        print(analyzed.model_dump_json(indent=2))
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
