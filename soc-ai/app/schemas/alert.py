from pydantic import BaseModel, Field, IPvAnyAddress, field_validator
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

class SeverityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RawAlert(BaseModel):
    """
    Represents a raw alert received from any source (Wazuh, Suricata).
    Keeps the original payload for reference.
    """
    source_system: str = Field(..., description="Source of the alert: wazuh, suricata")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    original_data: Dict[str, Any] = Field(..., description="The raw JSON payload")
    
    # Optional metadata extracted during ingestion if possible
    event_type: Optional[str] = None
    severity: Optional[str] = None

class NormalizedAlert(BaseModel):
    """
    Standardized internal alert format. All raw alerts are converted to this.
    """
    alert_id: str = Field(..., description="Unique ID for internal tracking")
    original_alert_id: Optional[str] = Field(None, description="ID from the source system")
    timestamp: datetime
    source_system: str
    
    # Core Event Details
    name: str = Field(..., description="Human readable name of the detection")
    description: Optional[str] = None
    severity: SeverityEnum
    
    # Network / Host Identifiers
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    
    # Host / User Details
    hostname: Optional[str] = None
    user: Optional[str] = None
    file_path: Optional[str] = None
    process_name: Optional[str] = None
    file_hash: Optional[str] = None
    
    # Context
    mitre_technique_id: Optional[str] = None
    mitre_technique_name: Optional[str] = None
    mitre_phase: Optional[int] = None
    
    # Advanced Analysis
    campaign_id: Optional[str] = None
    ueba_score: Optional[float] = None
    ueba_anomalies: Optional[List[str]] = None  # Specific behavioral deviations captured at ingestion
    
    # AI Extension
    embedding: Optional[List[float]] = None

    raw_data: Dict[str, Any] = Field(default_factory=dict) # Included for Dashboard visibility

class ThreatIntelReturns(BaseModel):
    opencti: List[str] = []
    cortex: List[str] = []
    thehive: List[str] = []

class Incident(BaseModel):
    """
    Represents a group of alerts. Now tracks both single-IP groups AND campaigns.
    """
    id: str = Field(..., description="Unique Incident ID (can be campaign ID or generated)")
    source_ip: str = Field(default="campaign", description="Primary Source IP or 'campaign'")
    campaign_id: Optional[str] = None
    victim_ip: Optional[str] = None
    alerts: List[NormalizedAlert]
    created_at: datetime
    
    # AI Analysis Results
    status: str = "pending" # pending, analyzing, completed
    risk_score: int = 0
    narrative: str = ""
    ai_reasoning: str = ""
    threat_intel: ThreatIntelReturns = Field(default_factory=ThreatIntelReturns)
    ai_recommendations: str = ""
    recommended_playbook: str = ""
    rca: str = ""
    mitre_tactic: str = ""
    attack_stage: str = ""
    threat_intel_indicators: List[str] = Field(default_factory=list)
    ueba_indicators: List[str] = Field(default_factory=list)
    blast_radius: List[str] = Field(default_factory=list)
    cves_exploited: List[str] = Field(default_factory=list)
    exact_mitre_ttps: List[str] = Field(default_factory=list)
    predicted_next_steps: str = ""
    killchain_phases_seen: List[int] = Field(default_factory=list)
    # Enrichment: summary of everything seen from/to the source IP (for the report).
    ip_history: dict = Field(default_factory=dict)

    @field_validator("ai_recommendations", "predicted_next_steps", "rca", "attack_stage", "recommended_playbook", mode="before")
    @classmethod
    def _normalize_string_fields(cls, value):
        if value is None:
            return ""
        if isinstance(value, list):
            return "\n".join(str(item) for item in value)
        return str(value)

    @field_validator(
        "threat_intel_indicators",
        "ueba_indicators",
        "blast_radius",
        "cves_exploited",
        "exact_mitre_ttps",
        "killchain_phases_seen",
        mode="before"
    )
    @classmethod
    def _normalize_list_fields(cls, value):
        if value is None:
            return []
        if isinstance(value, (list, tuple, set)):
            return list(value)
        return [value]

    @field_validator("threat_intel", mode="before")
    @classmethod
    def _normalize_threat_intel(cls, value):
        return value or ThreatIntelReturns()

