import asyncio
from app.services.aggregator import aggregator
from app.services.llm_engine import llm_engine
from loguru import logger
from app.core.config import settings
from app.services.threat_intel import threat_intel

async def run_analysis():
    logger.info("Starting manual AI Analysis Run")
    await aggregator.initialize()
    incidents = await aggregator.get_pending_incidents()
    logger.info(f"Found {len(incidents)} pending incidents")
    
    for incident in incidents:
        logger.info(f"Analyzing Incident {incident.id} with {len(incident.alerts)} alerts...")
        
        context = await aggregator.get_context(incident.source_ip)
        intel_report = await threat_intel.enrich_ip(incident.source_ip)
        
        logger.info("Executing LangGraph Incident Analysis...")
        analyzed_incident = await llm_engine.analyze_incident(
            incident, 
            previous_context=context,
            intel_context=intel_report
        )
        
        logger.info(f"LangGraph Output Received! Incident Explored: {analyzed_incident.narrative}")
        await aggregator.save_incident(analyzed_incident)

if __name__ == "__main__":
    asyncio.run(run_analysis())
