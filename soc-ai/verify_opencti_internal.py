import asyncio
import aiohttp
import json
import os

# USING DYNAMIC HOSTNAME
OPENCTI_URL = "http://opencti:8080/graphql"
OPENCTI_TOKEN = os.getenv("OPENCTI_TOKEN", "")
TARGET_IP = "172.126.230.141"

async def check_ip():
    print(f"🚀 Checking OpenCTI for IP: {TARGET_IP}...")
    
    query = """
    query StixCyberObservables($search: String) {
      stixCyberObservables(search: $search) {
        edges {
          node {
            id
            x_opencti_score
            x_opencti_description
            indicators {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
    """
    
    variables = {"search": TARGET_IP}
    headers = {
        "Authorization": f"Bearer {OPENCTI_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(OPENCTI_URL, json={'query': query, 'variables': variables}, headers=headers, timeout=5) as resp:
                print(f"Status Code: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    print(json.dumps(data, indent=2))
                    
                    # Logic Check
                    edges = data.get("data", {}).get("stixCyberObservables", {}).get("edges", [])
                    if edges:
                        print("✅ FOUND: IP exists in database!")
                    else:
                        print("⚠️ NOT FOUND: IP does not exist.")
                else:
                    print(f"❌ Failed: {await resp.text()}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_ip())
