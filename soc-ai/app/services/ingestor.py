import asyncio
from typing import List
from app.connectors.wazuh_reader import WazuhReader
from app.connectors.suricata_reader import SuricataReader
from app.schemas.alert import RawAlert
from app.services.normalizer import normalizer
from app.services.llm_engine import llm_engine
from loguru import logger
from app.services.aggregator import aggregator
from app.core.config import settings
from app.services.threat_intel import threat_intel

class IngestionService:
    def __init__(self):
        self.wazuh_reader = WazuhReader()
        self.suricata_reader = SuricataReader()
        self.normalizer = normalizer
        self.llm_engine = llm_engine
        self.aggregator = aggregator
        self.running = False
        self.tasks: List[asyncio.Task] = []

    async def start(self):
        """Starts all ingestion tasks."""
        self.running = True
        logger.info("Starting Ingestion Service...")
        
        # Start Wazuh Poller
        self.tasks.append(asyncio.create_task(self._wazuh_loop()))
        
        # Start Suricata Tailer
        self.tasks.append(asyncio.create_task(self._suricata_loop()))
        
        # Start AI Analysis Loop (Incidents)
        self.tasks.append(asyncio.create_task(self._analysis_loop()))
        
    async def stop(self):
        """Stops all tasks."""
        self.running = False
        logger.info("Stopping Ingestion Service...")
        for task in self.tasks:
            task.cancel()
        
    async def _is_ignored(self, ip: str) -> bool:
        if not ip: return False
        # Exact match or prefix match (simple subnet check)
        for ignored in settings.IGNORED_IPS:
            if ip == ignored or ip.startswith(ignored + "."):
                return True
        return False

    async def _wazuh_loop(self):
        logger.info("Starting Wazuh Ingestion Loop")
        try:
            async for alert_data in self.wazuh_reader.tail_logs():
                if not self.running:
                    break
                
                # Check Ignore List early (performance)
                src_ip = alert_data.get('srcip')
                if await self._is_ignored(src_ip):
                    continue

                # Process Alert
                raw_alert = RawAlert(
                    source_system="wazuh",
                    original_data=alert_data,
                    timestamp=alert_data.get("timestamp"),
                    event_type="wazuh_alert"
                )
                logger.debug(f"Ingested Wazuh Alert: {raw_alert.source_system}")
                
                # Normalize
                normalized = await self.normalizer.process(raw_alert)
                logger.info(f"Normalized Alert: {normalized.name} ({normalized.severity})")
                
                # Aggregate (Buffer)
                await self.aggregator.ingest(normalized)
                
        except asyncio.CancelledError:
            logger.info("Wazuh Loop Cancelled")
        except Exception as e:
            logger.error(f"Error in Wazuh Loop: {e}")

    async def _suricata_loop(self):
        logger.info("Starting Suricata Ingestion Loop")
        try:
            async for alert_data in self.suricata_reader.tail_logs():
                if not self.running:
                    break
                
                # Check Ignore List
                src_ip = alert_data.get('src_ip')
                if await self._is_ignored(src_ip):
                    continue
                
                # Process Alert
                raw_alert = RawAlert(
                    source_system="suricata",
                    original_data=alert_data,
                    timestamp=alert_data.get("timestamp"),
                    event_type="network_alert"
                )
                logger.debug(f"Ingested Suricata Alert: {raw_alert.source_system}")
                
                 # Normalize
                normalized = await self.normalizer.process(raw_alert)
                logger.info(f"Normalized Alert: {normalized.name} ({normalized.severity})")
                
                # Aggregate (Buffer)
                await self.aggregator.ingest(normalized)
                
        except asyncio.CancelledError:
            logger.info("Suricata Loop Cancelled")
        except Exception as e:
            logger.error(f"Error in Suricata Loop: {e}")

    async def _analysis_loop(self):
        """
        Background task to process aggregated incidents.
        """
        logger.info("Starting AI Analysis Loop")
        while self.running:
            try:
                # 1. Fetch pending incidents from Aggregator
                incidents = await self.aggregator.get_pending_incidents()
                
                for incident in incidents:
                    logger.info(f"Analyzing Incident {incident.id} with {len(incident.alerts)} alerts...")

                    # 1.5 Fetch Context (Stateful Memory)
                    context = await self.aggregator.get_context(incident.source_ip)
                    if context:
                        logger.info(f"Found previous context for {incident.source_ip}")

                    # 1.6 Fetch Threat Intel (OpenCTI)
                    intel_report = await threat_intel.enrich_ip(incident.source_ip)
                    if intel_report:
                        logger.info(f"Threat Intelligence found for {incident.source_ip}")

                    # 2. AI Analysis (Chain-of-Thought with Context & Intel)
                    analyzed_incident = await self.llm_engine.analyze_incident(
                        incident, 
                        previous_context=context,
                        intel_context=intel_report
                    )
                    
                    # 3. Save Result for Dashboard & Update Context
                    logger.info(f"Incident Explored: {analyzed_incident.narrative}")
                    await self.aggregator.save_incident(analyzed_incident)
                    
                await asyncio.sleep(5) # Poll every 5 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in Analysis Loop: {e}")
                await asyncio.sleep(5)

ingestor = IngestionService()
