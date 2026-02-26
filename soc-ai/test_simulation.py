import httpx
import asyncio
from datetime import datetime
import json
import time

API_URL = "http://localhost:8001/api/v1/alerts/manual"

# Simulated Raw Alerts
alerts = [
    # 1. Background Noise (Low and slow) - 192.168.1.50
    {
        "source_system": "wazuh",
        "timestamp": datetime.utcnow().isoformat(),
        "original_data": {
            "rule": {"level": 5, "description": "Failed password for admin", "mitre": {"id": ["T1110"]}},
            "srcip": "10.0.0.99",
            "dstip": "192.168.1.50",
            "data": {"srcuser": "admin", "process": "sshd"},
            "full_log": "sshd: Failed password for admin from 10.0.0.99 port 22"
        }
    },
    # 2. Critical Success - 192.168.1.50
    {
        "source_system": "wazuh",
        "timestamp": datetime.utcnow().isoformat(),
        "original_data": {
            "rule": {"level": 10, "description": "Successful login after brute force", "mitre": {"id": ["T1078"]}},
            "srcip": "10.0.0.99",
            "dstip": "192.168.1.50",
            "data": {"srcuser": "admin", "process": "sshd"},
            "full_log": "sshd: Accepted password for admin from 10.0.0.99 port 22 ssh2",
            "id": "123456"
        }
    },
    # 3. Lateral Movement (Network) .50 -> .51
    {
        "source_system": "suricata",
        "timestamp": datetime.utcnow().isoformat(),
        "original_data": {
            "alert": {"severity": 1, "signature": "ET MALWARE Suspicious Lateral Connection", "category": "A Network Trojan was Detected"},
            "src_ip": "192.168.1.50",
            "dest_ip": "192.168.1.51",
            "src_port": 4444,
            "dest_port": 22,
            "app_proto": "ssh"
        }
    },
    # 4. Action on Objectives -> .51
    {
        "source_system": "wazuh",
        "timestamp": datetime.utcnow().isoformat(),
        "original_data": {
            "rule": {"level": 12, "description": "Suspicious Process Creation (whoami)", "mitre": {"id": ["T1059"]}},
            "srcip": "192.168.1.50",
            "dstip": "192.168.1.51",
            "data": {"user": "root", "process": "whoami"},
            "full_log": "cwd=/root process=whoami",
            "agent": {"name": "server-51"}
        }
    }
]

async def send_alert(alert):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(API_URL, json=alert)
            print(f"Sent {alert['source_system']} alert -> {resp.status_code}")
        except Exception as e:
            print(f"Error sending alert: {e}")

async def run_simulation():
    print("Starting SOC-AI Multi-IP Lateral Movement Simulation...")
    for alert in alerts:
        await send_alert(alert)
        await asyncio.sleep(1) # Slight delay to emulate event stream
        
    print("Finished sending alerts. Wait ~65 seconds for the Aggregator to trigger LangGraph...")
    # The aggregator window is 60 seconds

if __name__ == "__main__":
    asyncio.run(run_simulation())
