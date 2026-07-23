import requests
import json
import time
import random

API_URL = "http://127.0.0.1:8001/api/v1/alerts/manual"

# Simulation: Brute Force Attack followed by Exploit
SOURCE_IP = "192.168.1.105"
TARGET_IP = "10.0.0.5"

def send_alert(name, description, severity="low"):
    payload = {
        "source_system": "wazuh",
        "original_data": {
            "rule": {"description": name, "level": 10 if severity == "high" else 5},
            "full_log": description,
            "srcip": SOURCE_IP,
            "dstip": TARGET_IP,
            "id": f"test-{random.randint(1000,9999)}"
        }
    }
    try:
        resp = requests.post(API_URL, json=payload)
        print(f"Sent: {name} -> {resp.status_code}")
    except Exception as e:
        print(f"Failed: {e}")

print("🚀 Starting Attack Simulation...")

# Step 1: Recon
send_alert("SSH Connection Attempt", "Failed password for root from 192.168.1.105 port 22", "low")
time.sleep(1)

# Step 2: Brute Force
for i in range(4):
    send_alert("SSH Connection Attempt", f"Failed password for root from 192.168.1.105 port 22 (Attempt {i+1})", "low")
    time.sleep(0.5)

# Step 3: Exploit
time.sleep(1)
send_alert("Privilege Escalation Detected", "User root execution of /bin/sh via sudo without password", "critical")

print("✅ Simulation Complete. Check Dashboard in ~60 seconds.")
