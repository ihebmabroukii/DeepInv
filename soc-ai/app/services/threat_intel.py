import aiohttp
from typing import Optional
from app.core.config import settings
from loguru import logger

class ThreatIntelService:
    def __init__(self):
        self.url = f"{settings.OPENCTI_URL}/graphql"
        self.headers = {
            "Authorization": f"Bearer {settings.OPENCTI_TOKEN}",
            "Content-Type": "application/json"
        }

    async def enrich_ip(self, ip: str) -> Optional[str]:
        """
        Query OpenCTI for the IP address.
        """
        query = """
        query StixCyberObservables($search: String) {
          stixCyberObservables(search: $search, types: ["IPv4-Addr"], first: 1) {
            edges {
              node {
                observable_value
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
        
        variables = {"search": ip}
        
        try:
            logger.info(f"🔍 Connecting to OpenCTI for IP: {ip} ...")
            async with aiohttp.ClientSession() as session:
                async with session.post(self.url, json={'query': query, 'variables': variables}, headers=self.headers, timeout=5) as resp:
                    if resp.status != 200:
                        logger.warning(f"OpenCTI Error: {resp.status}")
                        return None
                    
                    data = await resp.json()
                    logger.info(f"Tell OpenCTI Response: {data}")
                    
                    # Parse Response
                    observables = data.get("data", {}).get("stixCyberObservables", {}).get("edges", [])
                    if not observables:
                        return None # No intel found
                    
                    node = observables[0]["node"]
                    
                    # Double check exact match
                    if node["observable_value"] != ip:
                        return None

                    score = node.get("x_opencti_score", 0)
                    desc = node.get("x_opencti_description") or "No description."
                    
                    # Indicators
                    indicators = [i["node"]["name"] for i in node.get("indicators", {}).get("edges", [])]
                    indicators_str = ", ".join(indicators) if indicators else "None"

                    return (
                        f"THREAT INTEL REPORT for {ip}:\n"
                        f"- Source: OpenCTI (Real-time)\n"
                        f"- Risk Score: {score}/100\n"
                        f"- Description: {desc}\n"
                        f"- Active Indicators: {indicators_str}"
                    )
                    
        except Exception as e:
            logger.error(f"Failed to query OpenCTI: {e}")
            return None

threat_intel = ThreatIntelService()
