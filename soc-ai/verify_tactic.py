import requests
import time
import random

API_URL = "http://localhost:8000/api/v1/alerts/manual"

def send_alert(ip, name, description, severity="medium"):
    payload = {
        "source_system": "suricata",
        "original_data": {
            "signature": name,
            "category": description,
            "src_ip": ip,
            "dest_ip": "100.100.100.100",
            "timestamp": "2024-01-01T12:00:00.000000+0000" # Dummy time
        }
    }
    try:
        requests.post(API_URL, json=payload)
        print(f"Sent to {ip}: {name}")
    except Exception as e:
        print(f"Failed to send to {ip}: {e}")

print("🚀 Starting TACTIC ACCURACY TEST...")
TARGET_IP = "10.0.0.88"

# Simulate Data Exfiltration (Should be 'Exfiltration', NOT 'Initial Access')
alerts = [
    ("ET MALWARE Likely Data Exfiltration via FTP", "A large file transfer detected over FTP"),
    ("ET POLICY FTP Login Successful", "Potential unauthorized file transfer"),
    ("ET INFO Large Outbound Traffic", "High volume of outbound traffic detected")
]

print(f"\n[Test] Sending Exfiltration Scenario to {TARGET_IP}...")
for name, desc in alerts:
    send_alert(TARGET_IP, name, desc, "high")

print("✅ Alerts Sent. Check logs and verify Tactic != Initial Access.")
