import requests
import time
import random

API_URL = "http://localhost:8000/api/v1/alerts/manual"

def send_alert(ip, name, description, severity="low"):
    payload = {
        "source_system": "wazuh",
        "original_data": {
            "rule": {"description": name, "level": 10 if severity == "high" else 5},
            "full_log": description,
            "srcip": ip,
            "dstip": "10.0.0.5",
            "id": f"test-{random.randint(10000,99999)}"
        }
    }
    try:
        requests.post(API_URL, json=payload)
        print(f"Sent to {ip}: {name}")
    except Exception as e:
        print(f"Failed to send to {ip}: {e}")

print("🚀 Starting NOISE REDUCTION TEST...")

# 1. Send NOISE (Should be ignored)
print("\n[Test 1] Sending 5 alerts from IGNORED IP (192.168.65.1)...")
for i in range(5):
    send_alert("192.168.65.1", "Internal Whitelist Noise", "Just some internal docker chatter", "low")

# 2. Send THREAT (Should be processed)
print("\n[Test 2] Sending 5 alerts from THREAT IP (10.0.0.99)...")
for i in range(5):
    send_alert("10.0.0.99", "SQL Injection Attempt", "GET /login.php?user=' OR '1'='1", "high")

print("✅ Alerts Sent. Check logs/dashboard.")
