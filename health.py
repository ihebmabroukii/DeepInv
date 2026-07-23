import urllib.request
import ssl
import socket
import logging

logging.basicConfig(level=logging.ERROR)

endpoints = {
    'Frontend': 'http://localhost:3000',
    'Wazuh API': 'https://localhost:55000/security/user/authenticate',
    'TheHive': 'http://localhost:9000',
    'OpenCTI': 'http://localhost:8888',
    'Cortex': 'http://localhost:9001',
    'SOC AI API': 'http://localhost:8001/docs'
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

with open('health_report.txt', 'w', encoding='utf-8') as f:
    f.write('\n--- SYSTEM HEALTH CHECK ---\n')
    for name, url in endpoints.items():
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            resp = urllib.request.urlopen(req, context=ctx, timeout=3)
            f.write(f'[OK] {name}: ONLINE (HTTP {resp.getcode()})\n')
        except urllib.error.HTTPError as e:
            f.write(f'[OK] {name}: ONLINE (HTTP {e.code})\n')
        except Exception as e:
            f.write(f'[FAIL] {name}: OFFLINE ({e})\n')
