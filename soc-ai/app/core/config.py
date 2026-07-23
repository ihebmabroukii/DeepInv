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
    THEHIVE_API_KEY: Optional[str] = None  # set via env / .env
    # Browser-facing base used only for links returned to the dashboard. The
    # internal *_URL above is reachable from the container (docker hostname);
    # this one must be reachable from the analyst's browser (published port).
    THEHIVE_PUBLIC_URL: str = "http://localhost:9000"

    # OpenCTI (Tier 2)
    # Accessed via Docker Network 'soc-tier2_soc-tier2-net'
    OPENCTI_URL: str = "http://opencti:8080"
    OPENCTI_TOKEN: str = ""  # set via env / .env

    # Cortex — reachable from the container via the docker network hostname.
    CORTEX_URL: str = "http://cortex:9001"
    CORTEX_API_KEY: Optional[str] = None
    CORTEX_PUBLIC_URL: str = "http://localhost:9001"

    # Security Onion Elasticsearch
    SO_ELASTIC_URL: str = "https://security-onion.local:9200"
    SO_ELASTIC_USER: str = "so_elastic"
    SO_ELASTIC_PASS: str = ""  # set via env / .env

    # AI Configuration (Ollama)
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    AI_MODEL_NAME: str = "mistral:latest"
    HF_TOKEN: Optional[str] = None

    # Deterministic CVE resolution — local authoritative catalogue (CISA-KEV / NVD
    # export). The cve_expert LLM proposes candidates; they are validated against
    # this list and any that do not exist are dropped. Replaceable with the full feed.
    CVE_CATALOGUE_PATH: str = "app/data/cve_catalogue.json"

    # Redis (For Correlation/State)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Noise Reduction
    IGNORED_IPS: List[str] = ["192.168.65.1", "192.168.65.7"] # Internal Docker Traffic

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
