import requests
import time
from datetime import datetime, timezone

def run_simulation():
    print("🚀 Triggering APT29 Multi-Staged Attack Pattern...")
    
    # Simulating a severe alert with deep correlation (Wazuh + Suricata hints)
    alert = {
        "source_system": "wazuh",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_data": {
            "rule": {
                "level": 14,
                "description": "APT29 Suspected: Credential Dumping, Lateral Movement, and Data Exfiltration via Encrypted Channel"
            },
            "srcip": "10.0.55.201", 
            "dstip": "185.122.204.10", # Known bad intel IP
            "data": {
                "srcuser": "service_sql_admin",
                "process": "lsass.exe",
                "network_protocol": "HTTPS"
            },
            "full_log": (
                "15:02:01 - WAZUH: Suspicious process mimikatz.exe detected accessing lsass.exe on DB-SERVER-01.\n"
                "15:05:30 - WAZUH: Multiple failed login attempts (EventID 4625) followed by successful Admin login from 10.0.55.201.\n"
                "15:40:12 - SURICATA: Alert - Detect outbound connection to known malicious C2 IP 185.122.204.10 (Associated with APT29/Cozy Bear).\n"
                "15:55:00 - SURICATA: High volume encrypted traffic (4.2 GB) identified heading to 185.122.204.10."
            )
        }
    }

    print("\n📦 Pushing correlated multi-vector log to DeepInv SOC-AI Engine...")
    try:
        response = requests.post("http://localhost:8001/api/v1/alerts/manual", json=alert, timeout=5)
        print("✅ Received by Engine:", response.json())
        print("\n🧠 The LLM Graph is now active:")
        print("   - Ingestor is parsing the raw payload...")
        print("   - Analyzer is mapping events to MITRE ATT&CK (Credential Access -> Exfiltration)...")
        print("   - Entity Extractor is pulling IPs and usernames for Threat Intel enrichment...")
        print("   - The Node Reviewer is generating the final structured Incident Report with the RAG Playbook!")
        print("\n🌐 Navigate to: http://localhost:3000/reports")
        print("⏳ Wait ~20 seconds for the nodes to complete, then open the freshly generated report.")
    except Exception as e:
        print("❌ Error reaching the AI endpoint:", e)

if __name__ == "__main__":
    run_simulation()
