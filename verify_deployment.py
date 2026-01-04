
import urllib.request
import urllib.error
import urllib.parse
import json
import ssl
import sys
import time

BASE_URL = "https://localhost"
DIRECT_URL = "http://localhost:5000"

print("🚀 Starting Verificaton Pipeline...")

def get_ignore_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def test_connectivity():
    print(f"\n1️⃣  Testing Connectivity ({BASE_URL})...")
    try:
        url = f"{BASE_URL}/api/v1/health"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, context=get_ignore_ssl_context()) as response:
            if response.status == 200:
                print("   ✅ Nginx/Backend is reachable.")
                return True
    except Exception as e:
        print(f"   ❌ Connection Failed: {e}")
        print("   -> Ensure 'docker-compose up' is running.")
        return False

def test_bootstrap():
    print("\n2️⃣  Testing Agent Bootstrap (One-way TLS)...")
    # We need a valid token. For this test, ensuring the endpoint replies is enough,
    # or we can mock a token failure which proves connectivity.
    
    url = f"{BASE_URL}/api/v1/agents/bootstrap"
    data = json.dumps({"token": "INVALID_TEST_TOKEN"}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    
    try:
        with urllib.request.urlopen(req, context=get_ignore_ssl_context()) as response:
            print("   ❓ Unexpected Success with invalid token?")
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("   ✅ Bootstrap Endpoint reachable (Correctly rejected invalid token).")
        else:
             print(f"   ❌ Bootstrap Error: {e.code}")
    except Exception as e:
        print(f"   ❌ Bootstrap Failed: {e}")

def test_mtls_enforcement():
    print("\n3️⃣  Testing mTLS Enforcement...")
    # Trying to hit /verify WITHOUT a cert should fail at Nginx level
    # Nginx config: 'if ($ssl_client_verify != SUCCESS) { return 403; }'
    
    url = f"{BASE_URL}/api/v1/agents/verify"
    data = json.dumps({"system_time_utc": "2024-01-01T00:00:00Z"}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    
    try:
        with urllib.request.urlopen(req, context=get_ignore_ssl_context()) as response:
             print("   ❌ Security Hole: /verify accessible without Certificate!")
    except urllib.error.HTTPError as e:
        if e.code == 403:
             print("   ✅ mTLS Enforced: Nginx correctly rejected request without certificate (403 Forbidden).")
        else:
             print(f"   ⚠️  Unexpected Error code: {e.code}")
    except Exception as e:
        print(f"   ❌ Test Failed: {e}")

if __name__ == "__main__":
    if test_connectivity():
        test_bootstrap()
        test_mtls_enforcement()
        print("\n✨ Verification Suite Complete.")
    else:
        print("\n❌ Aborting: System not reachable.")
