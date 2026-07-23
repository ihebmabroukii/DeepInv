import requests
import json
import time
import argparse
import sys
from datetime import datetime, timezone

def send_alert(host_ip, port, alert_data):
    url = f"http://{host_ip}:{port}/api/v1/alerts/manual"
    
    payload = {
        "source_system": "suricata",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_data": alert_data
    }

    try:
        print(f"[*] Sending alert to SOC-AI at {url}...")
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            print("[+] Successfully sent alert to SOC-AI!")
            print("Response:", response.json())
        else:
            print(f"[-] Failed to send alert. Status Code: {response.status_code}")
            print("Response:", response.text)
    except requests.exceptions.RequestException as e:
        print(f"[-] Connection error: {e}")
        print(f"Make sure your Windows firewall allows traffic on port {port} and the host IP is correct.")

def tail_eve_json(host_ip, port, log_file):
    print(f"[*] Tailing {log_file} for alerts...")
    try:
        with open(log_file, "r") as f:
            # Go to the end of the file
            f.seek(0, 2)
            while True:
                line = f.readline()
                if not line:
                    time.sleep(0.5)
                    continue
                try:
                    data = json.loads(line)
                    # Check if it's an alert
                    if data.get("event_type") == "alert":
                        print("\n[!] Real alert detected in Security Onion!")
                        send_alert(host_ip, port, data)
                except json.JSONDecodeError:
                    pass
    except FileNotFoundError:
        print(f"[-] File not found: {log_file}. Ensure you have the correct path to Security Onion's eve.json.")
    except KeyboardInterrupt:
        print("\n[*] Stopping.")

def send_demo_alert(host_ip, port):
    # A mocked Log4j alert similar to what Security Onion would produce
    demo_alert = {
        "event_type": "alert",
        "alert": {
            "severity": 1,
            "signature": "ET EXPLOIT Apache log4j RCE Attempt (http jndi:ldap)",
            "category": "Attempted Administrator Privilege Gain"
        },
        "src_ip": "192.168.1.100", 
        "dest_ip": "10.0.12.50",
        "app_proto": "http",
        "full_log": "SECURITY ONION VM: Inbound HTTP POST request containing malicious JNDI lookup string."
    }
    print("[*] Simulating a real Log4j alert from Security Onion...")
    send_alert(host_ip, port, demo_alert)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Forward Security Onion alerts to DeepInv SOC-AI")
    parser.add_argument("--host", required=True, help="IP address of the Windows Host running SOC-AI")
    parser.add_argument("--port", default="8001", help="Port of the SOC-AI API (default: 8001)")
    parser.add_argument("--mode", choices=["demo", "live"], default="demo", help="Mode: 'demo' sends a fake alert, 'live' tails the real eve.json")
    parser.add_argument("--logfile", default="/nsm/sensor_data/hostname-eth0/dailylogs/eve.json", help="Path to Suricata eve.json (for live mode)")
    
    args = parser.parse_args()

    if args.mode == "demo":
        send_demo_alert(args.host, args.port)
    elif args.mode == "live":
        tail_eve_json(args.host, args.port, args.logfile)
