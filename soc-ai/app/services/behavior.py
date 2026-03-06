from loguru import logger
import os

class BehaviorAnalysisService:
    def __init__(self):
        self.es_url = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
        self.es_user = os.getenv("ELASTIC_USERNAME", "elastic")
        self.es_pass = os.getenv("ELASTIC_PASSWORD", "SecretPassword123")
        self._available = None  # None = not tested yet, False = unavailable, True = ok
        self.client = None

    def _init_client(self):
        """Lazily initialize Elasticsearch client only when first needed."""
        if self.client is None:
            try:
                from elasticsearch import AsyncElasticsearch
                self.client = AsyncElasticsearch(
                    self.es_url,
                    basic_auth=(self.es_user, self.es_pass),
                    verify_certs=False
                )
            except ImportError:
                logger.warning("elasticsearch library not installed — UEBA disabled.")
                self._available = False

    async def get_user_login_history(self, username: str, lookback_days: int = 30):
        """Query Elasticsearch for past successful logins by this user."""
        # If we already know ES is unavailable, skip immediately — no error spam
        if self._available is False:
            return "Behavioral Analysis Unavailable (Elasticsearch not reachable)."

        if not username or username == "unknown":
            return "No username provided for behavioral analysis."

        self._init_client()
        if self.client is None:
            return "Behavioral Analysis Unavailable."

        query = {
            "bool": {
                "must": [
                    {"match": {"data.srcuser": username}},
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
            self._available = True  # Mark as confirmed available

            hits = resp['hits']['hits']
            if not hits:
                return f"No historical activity found for user '{username}' in the last {lookback_days} days. This suggests a NEW or RARE user."

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
            if self._available is None:
                # Only log once on first failure
                logger.warning(f"Elasticsearch not reachable at {self.es_url} — UEBA disabled for this session.")
            self._available = False
            return "Behavioral Analysis Unavailable (Connection Error)."

behavior_analyzer = BehaviorAnalysisService()
