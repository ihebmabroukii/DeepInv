import asyncio
from typing import List
from app.connectors.wazuh_reader import WazuhReader
from app.connectors.suricata_reader import SuricataReader
from app.schemas.alert import RawAlert
from app.services.normalizer import normalizer
from app.services.llm_engine import llm_engine
from loguru import logger

class IngestionService:
    def __init__(self):
        self.wazuh_reader = WazuhReader()
        self.suricata_reader = SuricataReader()
        self.normalizer = normalizer
        self.llm_engine = llm_engine
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
        
    async def stop(self):
        """Stops all tasks."""
        self.running = False
        logger.info("Stopping Ingestion Service...")
        for task in self.tasks:
            task.cancel()
        
    async def _wazuh_loop(self):
        logger.info("Starting Wazuh Ingestion Loop")
        try:
            async for alert_data in self.wazuh_reader.tail_logs():
                if not self.running:
                    break
                
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
                
                # AI Analysis
                explanation = await self.llm_engine.analyze(normalized)
                logger.info(f"AI Explanation: {explanation}")
                
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
                
        except asyncio.CancelledError:
            logger.info("Suricata Loop Cancelled")
        except Exception as e:
            logger.error(f"Error in Suricata Loop: {e}")

ingestor = IngestionService()
