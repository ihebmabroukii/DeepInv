import urllib.request
import json
import time
from datetime import datetime

API_URL = 'http://localhost:8001/api/v1/alerts/manual'

alerts = [
    {
        'source_system': 'wazuh',
        'timestamp': datetime.utcnow().isoformat(),
        'original_data': {
            'rule': {'level': 5, 'description': 'Failed password for admin', 'mitre': {'id': ['T1110']}},
            'srcip': '10.0.0.99',
            'dstip': '192.168.1.50',
            'data': {'srcuser': 'admin', 'process': 'sshd'},
            'full_log': 'sshd: Failed password for admin from 10.0.0.99 port 22'
        }
    },
    {
        'source_system': 'wazuh',
        'timestamp': datetime.utcnow().isoformat(),
        'original_data': {
            'rule': {'level': 10, 'description': 'Successful login after brute force', 'mitre': {'id': ['T1078']}},
            'srcip': '10.0.0.99',
            'dstip': '192.168.1.50',
            'data': {'srcuser': 'admin', 'process': 'sshd'},
            'full_log': 'sshd: Accepted password for admin from 10.0.0.99 port 22 ssh2',
            'id': '123456'
        }
    },
    {
        'source_system': 'suricata',
        'timestamp': datetime.utcnow().isoformat(),
        'original_data': {
            'alert': {'severity': 1, 'signature': 'ET MALWARE Suspicious Lateral Connection', 'category': 'A Network Trojan was Detected'},
            'src_ip': '192.168.1.50',
            'dest_ip': '192.168.1.51',
            'src_port': 4444,
            'dest_port': 22,
            'app_proto': 'ssh'
        }
    },
    {
        'source_system': 'wazuh',
        'timestamp': datetime.utcnow().isoformat(),
        'original_data': {
            'rule': {'level': 12, 'description': 'Suspicious Process Creation (whoami)', 'mitre': {'id': ['T1059']}},
            'srcip': '192.168.1.50',
            'dstip': '192.168.1.51',
            'data': {'user': 'root', 'process': 'whoami'},
            'full_log': 'cwd=/root process=whoami',
            'agent': {'name': 'server-51'}
        }
    }
]

for idx, alert in enumerate(alerts, 1):
    data = json.dumps(alert).encode('utf-8')
    req = urllib.request.Request(API_URL, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f'Alert {idx} sent, status {resp.status}')
            print(resp.read().decode())
    except Exception as e:
        print(f'Alert {idx} failed: {e}')
    time.sleep(1)
