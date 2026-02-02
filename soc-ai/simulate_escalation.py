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

print("🚀 Starting ESCALATION Simulation (Stateful Memory Test)...")

# PHASE 1: Reconnaissance (Low Risk)
print("\n[Phase 1] Launching Port Scan (Should be Low Risk)...")
for i in range(5):
    send_alert("Port Scan Detected", f"Connection attempt to closed port {8000+i}", "low")
    time.sleep(0.2)

print("⏳ Waiting 70 seconds for Phase 1 to be analyzed and stored in Context...")
for i in range(7):
    time.sleep(10)
    print(f"Waiting... {70 - (i+1)*10}s")

# PHASE 2: Exploitation (High Risk)
print("\n[Phase 2] Launching SQL Injection (Should detect Escalation)...")
send_alert("SQL Injection Attempt", "GET /login.php?user=' OR '1'='1", "high")
send_alert("Web Attack", "Suspect URL pattern detected", "medium")

print("✅ Simulation Stage 2 Complete. Check logs for 'Previous Intelligence' usage.")
