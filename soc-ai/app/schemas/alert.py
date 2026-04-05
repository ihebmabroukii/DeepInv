from pydantic import BaseModel, Field, IPvAnyAddress
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
    
    # AI Extension
    embedding: Optional[List[float]] = None

    raw_data: Dict[str, Any] = Field(default_factory=dict) # Included for Dashboard visibility

class Incident(BaseModel):
    """
    Represents a group of alerts aggregated by Source IP.
    This is the unit of work for the AI Analyst.
    """
    id: str = Field(..., description="Unique Incident ID")
    source_ip: str
    alerts: List[NormalizedAlert]
    created_at: datetime
    
    # AI Analysis Results
    status: str = "pending" # pending, analyzing, completed
    risk_score: int = 0
    narrative: str = ""
    rca: str = ""
    mitre_tactic: str = ""
    attack_stage: str = ""
    threat_intel_indicators: List[str] = []

