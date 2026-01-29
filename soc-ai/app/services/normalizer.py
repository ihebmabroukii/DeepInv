from app.schemas.alert import RawAlert, NormalizedAlert, SeverityEnum
from loguru import logger
import uuid
from datetime import datetime

class Normalizer:
    async def process(self, raw_alert: RawAlert) -> NormalizedAlert:
        """
        Main entry point to normalize alerts.
        Dispatches to specific normalization logic based on source.
        """
        try:
            if raw_alert.source_system == "wazuh":
                return self._normalize_wazuh(raw_alert)
            elif raw_alert.source_system == "suricata":
                return self._normalize_suricata(raw_alert)
            else:
                raise ValueError(f"Unknown source system: {raw_alert.source_system}")
        except Exception as e:
            logger.error(f"Failed to normalize alert from {raw_alert.source_system}: {e}")
            raise

    def _normalize_wazuh(self, raw: RawAlert) -> NormalizedAlert:
        data = raw.original_data
        
        # Mappings for Wazuh
        # Rule level 1-15 -> Severity
        level = 0
        if 'rule' in data and 'level' in data['rule']:
            level = int(data['rule']['level'])
        
        severity = SeverityEnum.LOW
        if level >= 12: severity = SeverityEnum.CRITICAL
        elif level >= 10: severity = SeverityEnum.HIGH
        elif level >= 7: severity = SeverityEnum.MEDIUM

        return NormalizedAlert(
            alert_id=str(uuid.uuid4()),
            original_alert_id=data.get('id'),
            timestamp=raw.timestamp,
            source_system="wazuh",
            name=data.get('rule', {}).get('description', 'Unknown Wazuh Alert'),
            description=data.get('full_log'),
            severity=severity,
            
            src_ip=data.get('srcip'),
            dst_ip=data.get('dstip'),
            hostname=data.get('agent', {}).get('name'),
            mitre_technique_id=self._get_mitre(data)
        )

    def _normalize_suricata(self, raw: RawAlert) -> NormalizedAlert:
        data = raw.original_data
        alert_info = data.get('alert', {})
        
        # Suricata severity: 1 (High) - 3 (Low)
        severity_int = alert_info.get('severity', 3)
        severity = SeverityEnum.LOW
        if severity_int == 1: severity = SeverityEnum.HIGH
        elif severity_int == 2: severity = SeverityEnum.MEDIUM

        return NormalizedAlert(
            alert_id=str(uuid.uuid4()),
            timestamp=raw.timestamp,
            source_system="suricata",
            name=alert_info.get('signature', 'Unknown Network Alert'),
            description=f"Category: {alert_info.get('category')}",
            severity=severity,
            
            src_ip=data.get('src_ip'),
            dst_ip=data.get('dest_ip'),
            src_port=data.get('src_port'),
            dst_port=data.get('dest_port')
        )
        
    def _get_mitre(self, data: dict) -> str | None:
        if 'rule' in data and 'mitre' in data['rule']:
            return data['rule']['mitre'].get('id', [None])[0] # Take first ID
        return None

normalizer = Normalizer()
