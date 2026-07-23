import asyncio
from typing import List
from app.connectors.wazuh_reader import WazuhReader
from app.connectors.suricata_reader import SuricataReader
from app.connectors.so_elastic_reader import SOElasticReader
from app.schemas.alert import RawAlert
from app.services.normalizer import normalizer
from app.services.llm_engine import llm_engine
from loguru import logger
from app.services.aggregator import aggregator
from app.core.config import settings
from app.services.threat_intel import threat_intel
from app.services.ueba import ueba_service

# Suricata classtypes that are pure background noise and never represent a real
# threat. Dropping them at ingest stops benign traffic — e.g. the victim host's
# own apt/package-manager calls to Ubuntu servers ("ET INFO ... APT User-Agent
# Outbound") — from being aggregated into false "exfiltration" incidents.
# NOTE: real detections such as "ET SCAN Potential SSH Scan" carry the category
# "Attempted Information Leak", so they are unaffected by this filter.
BENIGN_SURICATA_CATEGORIES = {
    "not suspicious traffic",
    "unknown traffic",
}

def _is_benign_suricata(normalized) -> bool:
    if normalized.source_system != "suricata":
        return False
    category = (normalized.description or "").replace("Category:", "").strip().lower()
    return category in BENIGN_SURICATA_CATEGORIES

class IngestionService:
    def __init__(self):
        self.wazuh_reader = WazuhReader()
        self.suricata_reader = SuricataReader()
        self.so_elastic_reader = SOElasticReader()
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
        
        # Start Suricata Tailer (Legacy - Local File)
        self.tasks.append(asyncio.create_task(self._suricata_loop()))
        
        # Start Security Onion Elastic Poller
        self.tasks.append(asyncio.create_task(self._so_elastic_loop()))
        
        # Start AI Analysis Loop (Incidents)
        self.tasks.append(asyncio.create_task(self._analysis_loop()))
        
    async def stop(self):
        """Stops all tasks."""
        self.running = False
        logger.info("Stopping Ingestion Service...")
        for task in self.tasks:
            task.cancel()
        
        # Close Elasticsearch connection
        if hasattr(self, 'so_elastic_reader'):
            asyncio.create_task(self.so_elastic_reader.close())
        
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

                # UEBA in real-time: score FIRST (read-only) and stamp the verdict
                # onto the alert so it travels into the incident immutably. Only
                # learn behavior that is NOT anomalous — never whitelist an
                # attacker's IP/host/hours into the trusted baseline.
                if normalized.user:
                    score, anomalies = await ueba_service.evaluate(normalized)
                    normalized.ueba_score = score
                    normalized.ueba_anomalies = anomalies or None
                    if score < 0.5:
                        await ueba_service.update_profile(normalized)

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

                # Drop benign Suricata background noise before it reaches aggregation
                if _is_benign_suricata(normalized):
                    logger.debug(f"Skipping benign Suricata alert: {normalized.name}")
                    continue

                # Aggregate (Buffer)
                await self.aggregator.ingest(normalized)

        except asyncio.CancelledError:
            logger.info("Suricata Loop Cancelled")
        except Exception as e:
            logger.error(f"Error in Suricata Loop: {e}")

    async def _so_elastic_loop(self):
        logger.info("Starting Security Onion Elastic Polling Loop")
        try:
            async for alert_data in self.so_elastic_reader.poll_alerts():
                if not self.running:
                    break
                
                # Check Ignore List
                src_ip = alert_data.get('source', {}).get('ip') or alert_data.get('src_ip')
                if await self._is_ignored(src_ip):
                    continue
                
                # Detect source system dynamically
                event_module = alert_data.get('event', {}).get('module', '')
                source_system = "suricata"
                if "wazuh" in event_module.lower() or "ossec" in event_module.lower():
                    source_system = "wazuh"
                elif alert_data.get("rule", {}).get("description"):
                    # Wazuh usually has rule.description at the top level in some SO configurations
                    source_system = "wazuh"
                
                # Process Alert
                raw_alert = RawAlert(
                    source_system=source_system,
                    original_data=alert_data,
                    timestamp=alert_data.get("@timestamp") or alert_data.get("timestamp"),
                    event_type="elastic_alert"
                )
                logger.debug(f"Ingested Elastic Alert: {raw_alert.source_system}")
                
                 # Normalize
                normalized = await self.normalizer.process(raw_alert)
                logger.info(f"Normalized Elastic Alert: {normalized.name} ({normalized.severity})")

                # Drop benign Suricata background noise before it reaches aggregation
                if _is_benign_suricata(normalized):
                    logger.debug(f"Skipping benign Suricata alert: {normalized.name}")
                    continue

                # Aggregate (Buffer)
                await self.aggregator.ingest(normalized)

        except asyncio.CancelledError:
            logger.info("SO Elastic Loop Cancelled")
        except Exception as e:
            logger.error(f"Error in SO Elastic Loop: {e}")

    async def _analysis_loop(self):
        """
        Background task to process aggregated incidents.
        """
        logger.info("Starting AI Analysis Loop")
        while self.running:
            try:
                logger.info("Tick: Checking for pending incidents...")
                # 1. Fetch pending incidents from Aggregator
                incidents = await self.aggregator.get_pending_incidents()
                
                for incident in incidents:
                    logger.info(f"Analyzing Incident {incident.id} with {len(incident.alerts)} alerts...")

                    # Run analysis directly in the native async event loop
                    # Celery workers cause forked-process async HTTP client conflicts
                    # The async ingestor loop is the correct context for LangGraph
                    context = await self.aggregator.get_context(incident.source_ip)
                    intel_report = await threat_intel.enrich_ip(incident.source_ip)
                    
                    logger.info(f"Executing LangGraph Analysis for Incident {incident.id}...")
                    analyzed = await self.llm_engine.analyze_incident(
                        incident,
                        previous_context=context,
                        intel_context=intel_report
                    )
                    logger.info(
                        f"LangGraph Done! risk={analyzed.risk_score}, "
                        f"stage={analyzed.attack_stage}, mitre={analyzed.mitre_tactic}"
                    )
                    # Enrich with the source IP's observed history for the report.
                    try:
                        analyzed.ip_history = await self.aggregator.get_ip_history(analyzed.source_ip)
                    except Exception as e:
                        logger.warning(f"IP history enrichment failed: {e}")
                    await self.aggregator.save_incident(analyzed)
                    
                await asyncio.sleep(5) # Poll every 5 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                import traceback
                logger.error(f"Error in Analysis Loop: {e}\n{traceback.format_exc()}")
                await asyncio.sleep(5)

ingestor = IngestionService()
