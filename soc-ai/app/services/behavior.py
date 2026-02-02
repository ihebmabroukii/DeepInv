from elasticsearch import AsyncElasticsearch
from app.core.config import settings
from loguru import logger
import os

class BehaviorAnalysisService:
    def __init__(self):
        # We assume elasticsearch is reachable on port 9200 inside the docker network
        self.es_url = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
        self.es_user = os.getenv("ELASTIC_USERNAME", "elastic")
        self.es_pass = os.getenv("ELASTIC_PASSWORD", "SecretPassword123") # Should match Tier 1
        
        self.client = AsyncElasticsearch(
            self.es_url,
            basic_auth=(self.es_user, self.es_pass),
            verify_certs=False
        )

    async def get_user_login_history(self, username: str, lookback_days: int = 30):
        """
        Query Elasticsearch for past successful logins by this user.
        """
        if not username or username == "unknown":
            return "No username provided for behavioral analysis."

        query = {
            "bool": {
                "must": [
                    {"match": {"data.srcuser": username}},
                    # We want successful authentications or general activity
                    # Rule 5715 = SSH authentication success
                    # Rule 5710 = SSH attempt
                    # Or just general filtering for this user
                    {"range": {"timestamp": {"gte": f"now-{lookback_days}d/d"}}}
                ]
            }
        }
        
        try:
            resp = await self.client.search(
                index="wazuh-alerts-*",
                query=query,
                size=20,
                sort=[{"timestamp": "desc"}],
                _source=["data.srcip", "data.srcport", "agent.name", "rule.description", "timestamp"]
            )
            
            hits = resp['hits']['hits']
            if not hits:
                return f"No historical activity found for user '{username}' in the last {lookback_days} days. This suggests a NEW or RARE user."
            
            # Summarize
            ips = set()
            details = []
            for h in hits:
                src = h['_source']
                ip = src.get('data', {}).get('srcip', 'unknown')
                ips.add(ip)
                details.append(f"- {ip} ({src.get('rule', {}).get('description', 'Action')})")
            
            return (
                f"BEHAVIORAL ANALYSIS for user '{username}':\n"
                f"- Found {len(hits)} past events.\n"
                f"- Known IPs: {', '.join(ips)}\n"
                f"- Recent Activity:\n" + "\n".join(details[:5])
            )

        except Exception as e:
            logger.error(f"Failed to query Behavior Analysis: {e}")
            return "Behavioral Analysis Unavailable (Connection Error)."

behavior_analyzer = BehaviorAnalysisService()
