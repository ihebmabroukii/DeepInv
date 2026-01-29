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
    
    THEHIVE_URL: str = "http://thehive:9000"
    THEHIVE_API_KEY: Optional[str] = None
    
    OPENCTI_URL: str = "http://opencti:8080"
    OPENCTI_TOKEN: Optional[str] = None
    
    # AI Configuration (Ollama)
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    AI_MODEL_NAME: str = "mistral"

    # Redis (For Correlation/State)
    REDIS_URL: str = "redis://redis:6379/0"

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
