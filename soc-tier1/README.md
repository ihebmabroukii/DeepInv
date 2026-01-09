# SOC Tier-1 Deployment Walkthrough

## Overview
This directory contains the deployment configuration for a Tier-1 SOC environment including:
- **Elasticsearch** (Database)
- **Logstash** (Log Pipeline)
- **Kibana** (Visualization + Wazuh Plugin)
- **Wazuh Manager** (SIEM Engine)
- **Wazuh Agent** (Simulation)
- **Suricata** (IDS)

## Prerequisites
- Docker & Docker Compose
- > 6GB RAM available for containers

## Setup
1. **Environment Variables**:
   Ensure `soc.env` or `.env` exists. If not, copy from example:
   ```powershell
   copy .env.example .env
   ```

2. **Network Interface**:
   Edit `suricata/config/suricata.yaml` and check `af-packet` -> `interface` matches your host (e.g., `eth0`, `WiFi`, etc.).
   *Note: In `docker-compose.yml`, Suricata runs in `host` network mode.*

## Deployment
Start the stack:
```powershell
docker-compose up -d
```

## Verification
1. **Kibana**: Visit [http://localhost:5601](http://localhost:5601).
   - Login: `elastic` / `changeme` (or as configured in `.env`).
   - Click the **Wazuh** icon in the sidebar. It may take a minute to initialize.
2. **Wazuh Agent**:
   - Check the **Agents** tab in Wazuh. You should see `wazuh-agent-docker` as `Active`.
3. **Suricata Logs**:
   - Generate test traffic:
     ```bash
     curl http://testmyids.com
     ```
   - Check Wazuh "Security events" for the alert.

## Troubleshooting
- **Plugin Install Failed**: Check Kibana logs: `docker-compose logs kibana`.
- **Suricata Fails**: Check if interface name is correct in config.
