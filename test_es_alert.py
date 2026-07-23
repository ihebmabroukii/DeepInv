import os
import requests
import json
import urllib3
from datetime import datetime, timezone

# Disable insecure request warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# SO Configuration
SO_URL = os.getenv("SO_ELASTIC_URL", "https://security-onion.local:9200")
SO_USER = os.getenv("SO_ELASTIC_USER", "so_elastic")
SO_PASS = os.getenv("SO_ELASTIC_PASS", "")
INDEX = "logs-suricata.alerts-so-test"

# The fake alert in ECS format
fake_alert = {
    "@timestamp": datetime.now(timezone.utc).isoformat(),
    "event": {
        "module": "suricata",
        "dataset": "suricata.alert",
        "severity": 1
    },
    "rule": {
        "name": "ET EXPLOIT Possible CVE-2023-46805 Ivanti Connect Secure Auth Bypass",
        "category": "Attempted Administrator Privilege Gain",
        "id": "2050045"
    },
    "source": {
        "ip": "203.0.113.42",
        "port": 54321
    },
    "destination": {
        "ip": "10.0.0.100",
        "port": 443
    },
    "network": {
        "protocol": "https"
    },
    "message": "A malicious IP attempted to bypass authentication on the Ivanti gateway."
}

print(f"[*] Injecting fake alert into Security Onion Elasticsearch ({INDEX})...")

try:
    response = requests.post(
        f"{SO_URL}/{INDEX}/_doc",
        auth=(SO_USER, SO_PASS),
        json=fake_alert,
        verify=False,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code in [200, 201]:
        print("[+] Success! Alert injected into Security Onion.")
        print("[*] Your SOC-AI container should poll this within 2 seconds.")
        print("[*] Check your http://localhost:3000/alerts dashboard!")
    else:
        print(f"[-] Failed with status {response.status_code}: {response.text}")

except Exception as e:
    print(f"[-] Connection error: {e}")
