import requests
import json
import time
import random

API_URL = "http://localhost:8000/api/v1/alerts/manual"
SOURCE_IP = "10.0.0.99"
TARGET_IP = "10.0.0.5"

def send_alert(name, description, severity="low"):
    payload = {
        "source_system": "wazuh",
        "original_data": {
            "rule": {"description": name, "level": 10 if severity == "high" else 5},
            "full_log": description,
            "srcip": SOURCE_IP,
            "dstip": TARGET_IP,
            "id": f"test-{random.randint(10000,99999)}"
        }
    }
    try:
        requests.post(API_URL, json=payload)
        print(f"Sent: {name}")
    except Exception as e:
        print(f"Failed: {e}")

print("🚀 Starting PHASE 2 ONLY Simulation (Context Check)...")

# PHASE 2: Exploitation (High Risk)
print("\n[Phase 2] Launching SQL Injection...")
for i in range(5):
    send_alert(f"SQL Injection Step {i}", "GET /login.php?user=' OR '1'='1", "high")

print("✅ Phase 2 Sent (5 Alerts). Check Dashboard.")
