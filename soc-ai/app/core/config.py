from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI-Driven SOC Analyst"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # External Services (Tier 1 & 2)
    # Defaults assume Docker Service Discovery
    WAZUH_LOG_PATH: str = "/var/ossec/logs/alerts/alerts.json"
    
    SURICATA_LOG_PATH: str = "/var/log/suricata/eve.json" # If using volume mount
    # Or URL if using a forwarder
    
    THEHIVE_URL: str = "http://host.docker.internal:9000"
    THEHIVE_API_KEY: Optional[str] = "REDACTED"
    
    # OpenCTI (Tier 2)
    # Accessed via Docker Network 'soc-tier2_soc-tier2-net'
    OPENCTI_URL: str = "http://opencti:8080" 
    OPENCTI_TOKEN: str = "REDACTED"
    
    # AI Configuration (Ollama)
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    AI_MODEL_NAME: str = "mistral"

    # Redis (For Correlation/State)
    REDIS_URL: str = "redis://redis:6379/0"

    # Noise Reduction
    IGNORED_IPS: List[str] = ["192.168.65.1", "192.168.65.7"] # Internal Docker Traffic

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
