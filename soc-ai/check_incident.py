import requests
import json

try:
    resp = requests.get("http://localhost:8000/api/v1/alerts/incidents")
    incidents = resp.json()
    
    print(f"Total Incidents: {len(incidents)}")
    for i, inc in enumerate(incidents[:5]):
        print(f"--- Incident {i} ---")
        print(f"ID: {inc.get('id')}")
        print(f"IP: {inc.get('source_ip')}")
        print(f"Risk: {inc.get('risk_score')}")
        print(f"Narrative: {inc.get('narrative')[:100]}...") # Truncate
        
    print(f"Searching for 10.0.0.99...")
    for inc in incidents:
        if inc.get("source_ip") == "10.0.0.99":
            print(f"Found: {inc.get('id')} | Risk: {inc.get('risk_score')}")
            print(f"✅ FOUND Incident for 10.0.0.99")
            print(f"ID: {inc.get('id')}")
            print(f"Risk: {inc.get('risk_score')}")
            print(f"Narrative: {inc.get('narrative')}")
            found = True
            break
            
    if not found:
        print("❌ Incident for 10.0.0.99 NOT FOUND")
        print("Available IPs:", [i.get('source_ip') for i in incidents])

except Exception as e:
    print(f"Error: {e}")
