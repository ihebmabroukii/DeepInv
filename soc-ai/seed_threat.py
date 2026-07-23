import os
import sys
import subprocess

# Auto-install pycti if missing
try:
    import pycti
except ImportError:
    print("📦 Installing pycti...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pycti"])
    import pycti

from datetime import datetime

# Config
# Use localhost here because we are inside the container calling another container?
# NO. Inside container 'soc-ai', we must use 'http://opencti:8080'
API_URL = "http://opencti:8080"
API_TOKEN = os.getenv("OPENCTI_TOKEN", "")
TARGET_IP = "172.126.230.141"

def seed_data():
    print(f"🚀 Connecting to OpenCTI at {API_URL}...")
    client = pycti.OpenCTIApiClient(API_URL, API_TOKEN)
    
    print(f"💀 Creating Malicious Indicator for {TARGET_IP}...")
    
    # 1. Create the IPv4 Observable
    # Usage based on pycti docs (approx)
    try:
        observable = client.stix_cyber_observable.create(
            simple_observable_key="value",
            simple_observable_value=TARGET_IP,
            type="IPv4-Addr",
            x_opencti_score=100,
            x_opencti_description="CONFIRMED Brute Force Source (Wazuh Detected)",
            createIndicator=True, 
        )
        print(f"DEBUG: Create Result: {observable}")
        if not observable:
             print("❌ Failed to create observable (None returned).")
             return
             
        print(f"✅ Created/Found Observable: {observable.get('id', 'UNKNOWN_ID')}")
        
        # 2. Add Label (Tag)
        if 'id' in observable:
            client.stix_cyber_observable.add_label(
                id=observable["id"],
                label_name="Brute-Force"
            )
        print("✅ Added Label: Brute-Force")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    seed_data()
