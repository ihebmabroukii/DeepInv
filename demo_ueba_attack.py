import requests
import time
from datetime import datetime, timezone

def run_simulation():
    print("🚀 Triggering UEBA & Lateral Movement Multi-Vector Attack (Wazuh + Suricata)...")
    
    # 1. WAZUH ALERT
    wazuh_alert = {
        "source_system": "wazuh",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_data": {
            "rule": {
                "level": 14,
                "description": "Critical UEBA Anomaly: Impossible Travel & Credential Dumping."
            },
            "srcip": "10.0.12.50", 
            "data": {
                "srcuser": "jroberts",
                "process": "mimikatz.exe",
                "command": "sekurlsa::logonpasswords"
            },
            "full_log": (
                "WAZUH HIDS (10.0.12.50): User 'jroberts' logged in securely via VPN from Moscow, Russia (194.50.22.1). "
                "Impossible travel detected. 5 minutes later, suspicious process execution detected: mimikatz.exe dumping memory."
            )
        }
    }

    # 2. SURICATA ALERT (Triggered milliseconds later, same IP)
    suricata_alert = {
        "source_system": "suricata",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_data": {
            "alert": {
                "severity": 1,
                "signature": "ET TROJAN APT29 Data Exfiltration via Encrypted TLS",
                "category": "A Network Trojan was detected"
            },
            "src_ip": "10.0.12.50", 
            "dest_ip": "185.122.204.10",
            "src_port": 49152,
            "dest_port": 443,
            "app_proto": "tls",
            "full_log": (
                "SECURITY ONION / SURICATA NIDS: High-volume outbound TLS traffic (7.2 GB) from 10.0.12.50 to known malicious Russian infrastructure 185.122.204.10. "
                "Pattern matches typical lateral exfiltration techniques."
            )
        }
    }

    print("\n📦 Pushing [Wazuh] HIDS Alert to Engine...")
    try:
        requests.post("http://localhost:8001/api/v1/alerts/manual", json=wazuh_alert, timeout=5)
        print("✅ Wazuh alert queued.")
    except Exception as e:
        print("❌ Error reaching the AI endpoint:", e)
        
    time.sleep(2) # Give the aggregator 2 seconds
        
    print("📦 Pushing [Security Onion / Suricata] NIDS Alert to Engine...")
    try:
        requests.post("http://localhost:8001/api/v1/alerts/manual", json=suricata_alert, timeout=5)
        print("✅ Security Onion alert queued.")
        print("\n🧠 LLM Graph has received both vectors and is aggregating them by the target IP (10.0.12.50).")
        print("⏳ Wait ~25 seconds, then open the freshly generated report to see both distinct alert types separated!")
    except Exception as e:
        print("❌ Error reaching the AI endpoint:", e)

if __name__ == "__main__":
    run_simulation()
