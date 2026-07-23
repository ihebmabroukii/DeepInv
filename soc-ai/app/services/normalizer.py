from app.schemas.alert import RawAlert, NormalizedAlert, SeverityEnum
from app.services.mitre_phase_map import mitre_phase_map
from loguru import logger
import uuid
from datetime import datetime

class Normalizer:
    def __init__(self):
        self.embedding_model = None
        self.embedding_enabled = True
        self._embedding_checked = False

    def _ensure_embedding_model(self):
        if self._embedding_checked:
            return
        self._embedding_checked = True
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading SentenceTransformer embedding model...")
            self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            logger.warning(f"SentenceTransformer unavailable: {e}")
            self.embedding_model = None
            self.embedding_enabled = False

    async def process(self, raw_alert: RawAlert) -> NormalizedAlert:
        """
        Main entry point to normalize alerts.
        Dispatches to specific normalization logic based on source.
        """
        try:
            if raw_alert.source_system == "wazuh":
                alert = self._normalize_wazuh(raw_alert)
            elif raw_alert.source_system == "suricata":
                alert = self._normalize_suricata(raw_alert)
            else:
                raise ValueError(f"Unknown source system: {raw_alert.source_system}")
            
            # Generate embedding for semantic RAG
            if self.embedding_enabled:
                self._ensure_embedding_model()
                if self.embedding_model:
                    try:
                        text_to_embed = f"{alert.name} {alert.description or ''} User: {alert.user or 'None'} Process: {alert.process_name or 'None'} IP: {alert.src_ip or 'None'} -> {alert.dst_ip or 'None'}"
                        alert.embedding = self.embedding_model.encode(text_to_embed).tolist()
                    except Exception as e:
                        logger.warning(f"Embedding generation failed: {e}")
                        self.embedding_enabled = False
                        alert.embedding = []
                else:
                    alert.embedding = []
            else:
                alert.embedding = []
            return alert
        except Exception as e:
            logger.error(f"Failed to normalize alert from {raw_alert.source_system}: {e}")
            raise

    def _normalize_wazuh(self, raw: RawAlert) -> NormalizedAlert:
        data = raw.original_data
        
        rule_info = data.get('rule', {})
        event_info = data.get('event', {})
        source_info = data.get('source', {})
        dest_info = data.get('destination', {})
        
        # Rule level 1-15 -> Severity
        level = 0
        if 'level' in rule_info:
            level = int(rule_info['level'])
        
        severity = SeverityEnum.LOW
        if level >= 12: severity = SeverityEnum.CRITICAL
        elif level >= 10: severity = SeverityEnum.HIGH
        elif level >= 7: severity = SeverityEnum.MEDIUM

        # Entity Extraction
        inner_data = data.get('data', {})
        syscheck = data.get('syscheck', {})
        
        user_raw = data.get('user')
        user = (inner_data.get('srcuser') or inner_data.get('dstuser') or inner_data.get('user')
                or data.get('srcuser') or data.get('dstuser')
                or (user_raw.get('name') if isinstance(user_raw, dict) else user_raw))
        process_name = inner_data.get('process') or data.get('program_name') or data.get('process', {}).get('name')
        file_hash = syscheck.get('sha256_after') or inner_data.get('sha256') or data.get('file', {}).get('hash', {}).get('sha256')

        # Wazuh sshd/ossec decoders nest srcip inside the data sub-object
        src_ip = (data.get('srcip') or inner_data.get('srcip')
                  or source_info.get('ip') or data.get('source.ip'))
        dst_ip = (data.get('dstip') or inner_data.get('dstip')
                  or dest_info.get('ip') or data.get('destination.ip'))

        return NormalizedAlert(
            alert_id=str(uuid.uuid4()),
            original_alert_id=data.get('id') or event_info.get('id'),
            timestamp=raw.timestamp,
            source_system="wazuh",
            name=rule_info.get('description') or rule_info.get('name') or data.get('message') or 'Unknown Wazuh Alert',
            description=data.get('full_log') or data.get('message'),
            severity=severity,
            
            src_ip=src_ip,
            dst_ip=dst_ip,
            hostname=data.get('agent', {}).get('name') or data.get('host', {}).get('name'),
            mitre_technique_id=self._get_mitre(data),
            mitre_phase=mitre_phase_map.lookup(rule_info.get('description') or rule_info.get('name') or data.get('message')),
            
            user=user,
            process_name=process_name,
            file_hash=file_hash,
            raw_data=raw.original_data
        )

    def _normalize_suricata(self, raw: RawAlert) -> NormalizedAlert:
        data = raw.original_data
        alert_info = data.get('alert', {})
        
        # ECS Support: Security Onion stores alerts in Elasticsearch using ECS (Elastic Common Schema)
        rule_info = data.get('rule', {})
        event_info = data.get('event', {})
        source_info = data.get('source', {})
        dest_info = data.get('destination', {})
        
        # Severity mapping
        severity_int = alert_info.get('severity') or event_info.get('severity') or 3
        severity = SeverityEnum.LOW
        if severity_int == 1: severity = SeverityEnum.HIGH
        elif severity_int == 2: severity = SeverityEnum.MEDIUM

        # Entity Extraction
        process_name = data.get('app_proto') or data.get('network', {}).get('protocol')
        
        # Extract IPs (supports both raw suricata src_ip and ECS source.ip)
        src_ip = data.get('src_ip') or source_info.get('ip') or data.get('source.ip')
        dst_ip = data.get('dest_ip') or dest_info.get('ip') or data.get('destination.ip')
        
        src_port = data.get('src_port') or source_info.get('port') or data.get('source.port')
        dst_port = data.get('dest_port') or dest_info.get('port') or data.get('destination.port')
        
        # Alert Name and Description
        alert_name = alert_info.get('signature') or rule_info.get('name') or data.get('message') or 'Unknown Network Alert'
        category = alert_info.get('category') or rule_info.get('category') or event_info.get('category')
        description = f"Category: {category}" if category else data.get('message', 'No description provided')

        return NormalizedAlert(
            alert_id=str(uuid.uuid4()),
            timestamp=raw.timestamp,
            source_system="suricata",
            name=alert_name,
            description=description,
            severity=severity,
            
            src_ip=src_ip,
            dst_ip=dst_ip,
            src_port=src_port,
            dst_port=dst_port,
            
            mitre_phase=mitre_phase_map.lookup(alert_name),
            
            process_name=process_name,
            raw_data=raw.original_data
        )
        
    def _get_mitre(self, data: dict) -> str | None:
        if 'rule' in data and 'mitre' in data['rule']:
            return data['rule']['mitre'].get('id', [None])[0] # Take first ID
        return None

normalizer = Normalizer()
