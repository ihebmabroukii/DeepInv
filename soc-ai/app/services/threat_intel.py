import aiohttp
from typing import Optional, Dict, Any
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

    async def check_observable(self, value: str, type: str = "IPv4-Addr") -> Optional[Dict[str, Any]]:
        """Check if an observable exists in OpenCTI."""
        query = """
        query StixCyberObservables($search: String, $types: [String]) {
          stixCyberObservables(search: $search, types: $types, first: 1) {
            edges {
              node {
                id
                observable_value
                x_opencti_score
                x_opencti_description
              }
            }
          }
        }
        """
        variables = {"search": value, "types": [type]}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.url, json={'query': query, 'variables': variables}, headers=self.headers, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        edges = data.get("data", {}).get("stixCyberObservables", {}).get("edges", [])
                        if edges and edges[0]["node"]["observable_value"] == value:
                            return edges[0]["node"]
        except Exception as e:
            logger.error(f"OpenCTI check error: {e}")
        return None

    # OpenCTI's stixCyberObservableAdd takes `type` as a direct argument plus a
    # dedicated nested input per STIX observable type (there is no generic
    # "observable_value" field). Map the common types to (argName, inputType).
    _OBS_INPUT = {
        "IPv4-Addr": ("IPv4Addr", "IPv4AddrAddInput"),
        "IPv6-Addr": ("IPv6Addr", "IPv6AddrAddInput"),
        "Domain-Name": ("DomainName", "DomainNameAddInput"),
        "Hostname": ("Hostname", "HostnameAddInput"),
        "Url": ("Url", "UrlAddInput"),
        "Email-Addr": ("EmailAddr", "EmailAddrAddInput"),
        "Mac-Addr": ("MacAddr", "MacAddrAddInput"),
    }

    async def add_observable(self, value: str, type: str = "IPv4-Addr", description: str = "", score: int = 50) -> Optional[Dict[str, Any]]:
        """Add a new observable to OpenCTI."""
        arg_name, input_type = self._OBS_INPUT.get(type, ("IPv4Addr", "IPv4AddrAddInput"))
        mutation = f"""
        mutation AddObservable($type: String!, $score: Int, $desc: String, $data: {input_type}!) {{
          stixCyberObservableAdd(
            type: $type
            x_opencti_score: $score
            x_opencti_description: $desc
            {arg_name}: $data
          ) {{
            id
            observable_value
            x_opencti_score
            x_opencti_description
          }}
        }}
        """
        variables = {
            "type": type,
            "score": score,
            "desc": description,
            "data": {"value": value},
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.url, json={'query': mutation, 'variables': variables}, headers=self.headers, timeout=10) as resp:
                    data = await resp.json()
                    if resp.status == 200 and not data.get("errors"):
                        return data.get("data", {}).get("stixCyberObservableAdd")
                    logger.error(f"OpenCTI add error (HTTP {resp.status}): {data.get('errors') or await resp.text()}")
        except Exception as e:
            logger.error(f"OpenCTI add error: {e}")
        return None

threat_intel = ThreatIntelService()
