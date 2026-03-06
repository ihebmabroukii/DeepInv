import requests
import time
from datetime import datetime, timezone

def run_simulation():
    print("🚀 Triggering a live Critical Security Event for the AI...")
    
    # Simulating a severe alert 
    alert = {
        "source_system": "wazuh",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_data": {
            "rule": {
                "level": 12,
                "description": "Massive Data Exfiltration Attempt"
            },
            "srcip": "10.0.99.100", 
            "dstip": "1.1.1.1",
            "data": {
                "srcuser": "finance_admin_compromised"
            },
            "full_log": "User attempted to transfer 400GB of customer SQL backups to an external server via FTP at 3:00 AM."
        }
    }

    print("\n📦 Pushing raw alert to SOC-AI pipeline at port 8001...")
    try:
        response = requests.post("http://localhost:8001/api/v1/alerts/manual", json=alert, timeout=5)
        print("✅ Pipeline Response:", response.json())
        print("\n🧠 The LangGraph AI nodes are currently analyzing this incident (extracting tactics, assessing risk...).")
        print("🌐 Open your browser and navigate to: http://localhost:3000/dashboard (or /events)")
        print("⏳ You should see this incident appear on the web interface with full AI reasoning within a few seconds!")
    except Exception as e:
        print("❌ Error reaching the AI endpoint. Is the Docker container running?", e)

if __name__ == "__main__":
    run_simulation()
