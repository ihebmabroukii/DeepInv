import asyncio
import aiohttp
import json

# USING DYNAMIC HOSTNAME
OPENCTI_URL = "http://opencti:8080/graphql"
OPENCTI_TOKEN = "REDACTED"

async def test_opencti():
    print(f"🚀 Testing Connection to {OPENCTI_URL}...")
    
    query = """
    query {
      about {
        version
        platform_title
      }
    }
    """
    
    headers = {
        "Authorization": f"Bearer {OPENCTI_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(OPENCTI_URL, json={'query': query}, headers=headers, timeout=5) as resp:
                print(f"Status Code: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    print(f"✅ REAL CONNECTION SUCCESS!")
                    print(f"Connected to: {data['data']['about']['platform_title']} (v{data['data']['about']['version']})")
                else:
                    print(f"❌ Failed: {await resp.text()}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_opencti())
