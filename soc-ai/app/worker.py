import os
import asyncio
from celery import Celery
from loguru import logger
import json

# Setup Celery
redis_url = os.getenv("REDIS_URL", "redis://soc-ai-redis:6379/0")
celery_app = Celery("soc_ai_tasks", broker=redis_url, backend=redis_url)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

async def async_analyze_incident(incident_data: dict):
    from app.schemas.alert import Incident
    from app.services.llm_engine import llm_engine
    from app.services.aggregator import aggregator
    from app.services.threat_intel import threat_intel
    
    try:
        # Load incident from dict
        incident = Incident(**incident_data)
        logger.info(f"[Celery] Analyzing Incident {incident.id} with {len(incident.alerts)} alerts...")
        
        # 1. Fetch Context (Stateful Memory)
        context = await aggregator.get_context(incident.source_ip)
        if context:
            logger.info(f"[Celery] Found previous context for {incident.source_ip}")

        # 2. Fetch Threat Intel (OpenCTI)
        intel_report = await threat_intel.enrich_ip(incident.source_ip)
        if intel_report:
            logger.info(f"[Celery] Threat Intelligence found for {incident.source_ip}")

        # 3. AI Analysis
        logger.info(f"[Celery] Executing LangGraph for Incident {incident.id}...")
        analyzed_incident = await llm_engine.analyze_incident(
            incident, 
            previous_context=context,
            intel_context=intel_report
        )
        
        # 4. Save Result
        logger.info(f"[Celery] LangGraph Output Received! Incident {incident.id} scored {analyzed_incident.risk_score}")
        await aggregator.save_incident(analyzed_incident)
        
        return {"status": "success", "incident_id": incident.id, "risk_score": analyzed_incident.risk_score}
    except Exception as e:
        logger.error(f"[Celery] Error processing incident {incident_data.get('id', 'unknown')}: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(name="analyze_incident_task")
def analyze_incident_task(incident_data: dict):
    """
    Synchronous Celery task wrapper that runs the async analysis pipeline.
    """
    return asyncio.run(async_analyze_incident(incident_data))
