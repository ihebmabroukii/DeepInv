import os
import asyncio
from celery import Celery
from loguru import logger

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

# A single persistent event loop per worker process — avoids AioRpcHandler conflicts
# from asyncio.run() creating a new loop for every task call.
_loop = None

def _get_loop():
    global _loop
    if _loop is None or _loop.is_closed():
        _loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_loop)
    return _loop


async def async_analyze_incident(incident_data: dict):
    from app.schemas.alert import Incident
    from app.services.llm_engine import llm_engine
    from app.services.aggregator import aggregator
    from app.services.threat_intel import threat_intel

    try:
        incident = Incident(**incident_data)
        logger.info(f"[Celery] Analyzing Incident {incident.id} with {len(incident.alerts)} alerts...")

        # 1. Stateful Memory
        context = await aggregator.get_context(incident.source_ip)
        if context:
            logger.info(f"[Celery] Found previous context for {incident.source_ip}")

        # 2. Threat Intel
        intel_report = await threat_intel.enrich_ip(incident.source_ip)
        if intel_report:
            logger.info(f"[Celery] Threat Intel found for {incident.source_ip}")

        # 3. LangGraph AI Analysis
        logger.info(f"[Celery] Executing LangGraph for Incident {incident.id}...")
        analyzed = await llm_engine.analyze_incident(
            incident,
            previous_context=context,
            intel_context=intel_report
        )

        # 4. Persist the result
        logger.info(
            f"[Celery] Done! Incident {incident.id} — "
            f"risk={analyzed.risk_score}, stage={analyzed.attack_stage}, "
            f"mitre={analyzed.mitre_tactic}"
        )
        await aggregator.save_incident(analyzed)
        return {"status": "success", "incident_id": incident.id, "risk_score": analyzed.risk_score}

    except Exception as e:
        logger.error(f"[Celery] Error processing incident {incident_data.get('id', 'unknown')}: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return {"status": "error", "message": str(e)}


@celery_app.task(name="analyze_incident_task")
def analyze_incident_task(incident_data: dict):
    """
    Synchronous Celery task wrapper.
    Uses a persistent event loop per worker process to avoid AioRpcHandler conflicts.
    """
    loop = _get_loop()
    return loop.run_until_complete(async_analyze_incident(incident_data))
