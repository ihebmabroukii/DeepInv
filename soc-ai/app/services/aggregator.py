from datetime import datetime, timedelta, timezone
from typing import List, Dict
from loguru import logger
import redis.asyncio as redis
from app.core.config import settings
from app.schemas.alert import NormalizedAlert, Incident
from app.api.ws import manager
from app.services.campaign_correlator import campaign_correlator
from app.services.killchain_tracker import killchain_tracker
import json
import re
import numpy as np

class AggregatorService:
    def __init__(self):
        # Redis Connection
        self.redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            health_check_interval=30,
            socket_keepalive=True,
        )
        self.window_seconds = 60  # Group alerts every 60 seconds
        self.min_alerts_for_incident = 2 # Minimum alerts to trigger analysis
        # A campaign is held for this long (from its first alert) before it is
        # analyzed, so slower sensors (Security Onion's ~30s pipeline) can join
        # the SAME incident as fast ones (Wazuh log-tail) instead of forming a
        # second incident. Tunable via the INCIDENT_WINDOW_SECONDS env var.
        self.incident_window_seconds = getattr(settings, "INCIDENT_WINDOW_SECONDS", 45)
        self.playbook_embedding_model = None
        self.playbook_model_available = True
    
    def _ensure_playbook_model(self):
        if self.playbook_embedding_model is not None or not self.playbook_model_available:
            return
        try:
            from sentence_transformers import SentenceTransformer
            self.playbook_embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Loaded playbook embedding model")
        except Exception as e:
            logger.warning(f"Playbook embedding model unavailable: {e}")
            self.playbook_embedding_model = None
            self.playbook_model_available = False

    async def initialize(self):
        try:
            from redis.commands.search.field import TextField, TagField, VectorField, NumericField
            from redis.commands.search.index_definition import IndexDefinition, IndexType
            
            # Check if index exists
            try:
                await self.redis.ft("idx:alerts").info()
                logger.info("Index 'idx:alerts' already exists")
            except Exception:
                # Define schema
                schema = (
                    TagField("$.src_ip", as_name="src_ip"),
                    TagField("$.dst_ip", as_name="dst_ip"),
                    TagField("$.user", as_name="user"),
                    NumericField("$.timestamp", as_name="timestamp"),
                    TextField("$.process_name", as_name="process_name"),
                    VectorField("$.embedding", "HNSW", {"TYPE": "FLOAT32", "DIM": 384, "DISTANCE_METRIC": "COSINE"}, as_name="embedding")
                )
                
                await self.redis.ft("idx:alerts").create_index(
                    schema,
                    definition=IndexDefinition(prefix=["alert:"], index_type=IndexType.JSON)
                )
                logger.info("Created 'idx:alerts' index")
        except Exception as e:
            logger.error(f"Failed to initialize RediSearch: {e}")
            
        await self.initialize_playbooks()

    async def initialize_playbooks(self):
        try:
            from redis.commands.search.field import TextField, VectorField
            from redis.commands.search.index_definition import IndexDefinition, IndexType
            import os
            from sentence_transformers import SentenceTransformer
            
            # Check if index exists
            try:
                await self.redis.ft("idx:playbooks").info()
            except Exception:
                schema = (
                    TextField("$.name", as_name="name"),
                    TextField("$.content", as_name="content"),
                    VectorField("$.embedding", "HNSW", {"TYPE": "FLOAT32", "DIM": 384, "DISTANCE_METRIC": "COSINE"}, as_name="embedding")
                )
                await self.redis.ft("idx:playbooks").create_index(
                    schema,
                    definition=IndexDefinition(prefix=["playbook:"], index_type=IndexType.JSON)
                )
                logger.info("Created 'idx:playbooks' index")

            # Load playbooks from disk
            playbooks_dir = os.path.join(os.getcwd(), "playbooks")
            if not os.path.exists(playbooks_dir):
                logger.warning(f"Playbooks directory not found at {playbooks_dir}")
                return
                
            self._ensure_playbook_model()
            for file_name in os.listdir(playbooks_dir):
                if file_name.endswith(".md"):
                    with open(os.path.join(playbooks_dir, file_name), "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    embedding = []
                    if self.playbook_embedding_model:
                        try:
                            embedding = self.playbook_embedding_model.encode(content).tolist()
                        except Exception as e:
                            logger.warning(f"Playbook embedding generation failed for {file_name}: {e}")
                            self.playbook_model_available = False
                            embedding = []
                    playbook_doc = {
                        "name": file_name,
                        "content": content,
                        "embedding": embedding
                    }
                    await self.redis.json().set(f"playbook:{file_name}", "$", playbook_doc)
            logger.info("Playbooks loaded into Redis")
        except Exception as e:
            logger.error(f"Failed to initialize playbooks: {e}")

    async def get_relevant_playbook(self, query: str) -> str:
        """
        Retrieves the most semantically relevant playbook for a given query (e.g., MITRE tactic).
        """
        try:
            if not self.playbook_embedding_model and self.playbook_model_available:
                self._ensure_playbook_model()
            if not self.playbook_embedding_model:
                logger.warning("Playbook semantic search unavailable, falling back to default recommendations.")
                return "No specific playbook available. Use standard security hardening steps and analyst review."

            from redis.commands.search.query import Query
            import numpy as np
            
            query_vector = self.playbook_embedding_model.encode(query).tolist()
            q_str = "*=>[KNN 1 @embedding $vec AS score]"
            q = Query(q_str).sort_by("score").return_fields("content", "score").dialect(2)
            query_vector_bytes = np.array(query_vector, dtype=np.float32).tobytes()
            
            res = await self.redis.ft("idx:playbooks").search(q, query_params={"vec": query_vector_bytes})
            
            if res.docs:
                return res.docs[0].content
            return "No specific playbook found. Provide standard best-practice security recommendations."
        except Exception as e:
            logger.error(f"Failed to fetch playbook for query '{query}': {e}")
            return "No specific playbook found. Provide standard best-practice security recommendations."

    async def ingest(self, alert: NormalizedAlert):
        """
        Adds an alert to the aggregation buffer and RedisJSON for complex querying.
        """
        try:
            # Check Ignore List (Global Filter)
            if alert.src_ip:
                for ignored in settings.IGNORED_IPS:
                    if alert.src_ip == ignored or alert.src_ip.startswith(ignored + "."):
                        logger.debug(f"Ignored alert from {alert.src_ip}")
                        return

            # Store as RedisJSON for Vector/Graph search
            alert_key = f"alert:{alert.alert_id}"
            await self.redis.json().set(alert_key, "$", alert.model_dump(mode="json"))
            await self.redis.expire(alert_key, 86400 * 7) # Keep history for 7 days

            # Check Campaign Correlation
            campaign_id = await campaign_correlator.check_campaign(alert)
            if not campaign_id:
                campaign_id = f"cmp-{alert.src_ip or 'unknown'}" # Default campaign is just the source IP
                
            alert.campaign_id = campaign_id
            await campaign_correlator.register_alert_for_campaigns(alert, campaign_id)
            
            # Check Kill Chain Progression
            await killchain_tracker.register_phase(alert)

            # Group by Campaign ID instead of just Source IP
            group_key = f"alerts:{campaign_id}"
            await self.redis.rpush(group_key, alert.model_dump_json())
            await self.redis.expire(group_key, 7200)  # 2-hour window so alerts survive long AI analysis

            # Stamp the campaign's first-seen time once, so the analysis loop can
            # hold it for a short aggregation window and let slower sensors join.
            first_key = f"campaign_first:{campaign_id}"
            if await self.redis.setnx(first_key, datetime.now(timezone.utc).timestamp()):
                await self.redis.expire(first_key, 7200)

            # Save raw alert to history (capped at 200 items)
            await self.redis.lpush("alerts:history", alert.model_dump_json())
            await self.redis.ltrim("alerts:history", 0, 199)
            
            # Broadcast raw alert via WebSocket
            ws_payload = {
                "type": "raw_alert",
                "data": alert.model_dump(mode="json")
            }
            await manager.broadcast(json.dumps(ws_payload))
            
            logger.debug(f"Buffered, indexed and broadcasted alert {alert.alert_id}")
            
        except Exception as e:
            logger.error(f"Aggregation Failed: {e}")

    async def get_pending_incidents(self) -> List[Incident]:
        """
        Scans Redis for alert groups that are ready for analysis.
        """
        incidents = []
        try:
            keys = await self.redis.keys("alerts:*")
            
            for key in keys:
                if key == "alerts:history":
                    continue

                try:
                    campaign_id = key.split(":", 1)[1]
                except IndexError:
                    campaign_id = "unknown_campaign"

                # Skip the catch-all bucket for alerts that have no source IP
                # (benign host/informational events like "service scheduled").
                # These are not attacker campaigns and must not spawn "campaign"
                # incidents that leak the placeholder into MITRE/remediation.
                if campaign_id in ("cmp-unknown", "unknown_campaign"):
                    continue

                count = await self.redis.llen(key)
                if count < 1:
                    continue

                # Aggregation window: hold a young campaign briefly so slower
                # sensors (Security Onion is ~30s behind Wazuh) can join the SAME
                # incident instead of forming a second one. Analyze only once the
                # window since the campaign's first alert has elapsed.
                first_raw = await self.redis.get(f"campaign_first:{campaign_id}")
                if first_raw:
                    age = datetime.now(timezone.utc).timestamp() - float(first_raw)
                    if age < self.incident_window_seconds:
                        continue  # still collecting — let slower sensors arrive

                # Cap alerts per incident to keep LangGraph context manageable on CPU
                MAX_ALERTS_PER_INCIDENT = 25
                raw_alerts = await self.redis.lrange(key, -MAX_ALERTS_PER_INCIDENT, -1)
                alerts = [NormalizedAlert.model_validate_json(a) for a in raw_alerts]

                # Extract a primary source IP and victim IP for backward compatibility
                # and context mapping
                primary_src_ip = alerts[0].src_ip if alerts[0].src_ip else "campaign"
                primary_dst_ip = alerts[0].dst_ip or alerts[0].hostname

                # Get Kill Chain Phases if we have a victim
                killchain_phases = []
                if primary_dst_ip:
                    killchain_phases = await killchain_tracker.get_victim_phases(primary_dst_ip)

                incident = Incident(
                    id=f"inc-{datetime.now().timestamp()}",
                    source_ip=primary_src_ip,
                    campaign_id=campaign_id,
                    victim_ip=primary_dst_ip,
                    alerts=alerts,
                    created_at=datetime.now(timezone.utc),
                    killchain_phases_seen=killchain_phases
                )
                incidents.append(incident)
                await self.redis.delete(key)
                await self.redis.delete(f"campaign_first:{campaign_id}")
            return incidents
        except Exception as e:
            logger.error(f"Failed to fetch incidents: {e}")
            return []

    async def get_pending_incident_groups(self) -> List[Incident]:
        """
        Returns current alert groups waiting for analysis without deleting them.
        """
        incidents = []
        try:
            keys = await self.redis.keys("alerts:*")
            for key in keys:
                if key == "alerts:history":
                    continue
                # Hide the no-source-IP catch-all bucket from the pending view too.
                if key == "alerts:cmp-unknown":
                    continue
                count = await self.redis.llen(key)
                if count == 0:
                    continue

                raw_alerts = await self.redis.lrange(key, 0, -1)
                alerts = [NormalizedAlert.model_validate_json(a) for a in raw_alerts]
                try:
                    campaign_id = key.split(":", 1)[1]
                except IndexError:
                    campaign_id = "unknown_campaign"

                primary_src_ip = alerts[0].src_ip if alerts[0].src_ip else "campaign"
                primary_dst_ip = alerts[0].dst_ip or alerts[0].hostname

                killchain_phases = []
                if primary_dst_ip:
                    killchain_phases = await killchain_tracker.get_victim_phases(primary_dst_ip)

                incident = Incident(
                    id=f"pending-{campaign_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    source_ip=primary_src_ip,
                    campaign_id=campaign_id,
                    victim_ip=primary_dst_ip,
                    alerts=alerts,
                    created_at=datetime.now(timezone.utc),
                    status="pending",
                    risk_score=0,
                    narrative="",
                    ai_reasoning="",
                    killchain_phases_seen=killchain_phases
                )
                incidents.append(incident)
            return incidents
        except Exception as e:
            logger.error(f"Failed to fetch pending incident groups: {e}")
            return []

    @staticmethod
    def _escape_tag(value: str) -> str:
        """Escape special chars in RediSearch tag values (dots, colons, etc.)."""
        return re.sub(r'([.:\-@!{}\[\]|&()])', r'\\\1', value)

    async def get_related_alerts(self, query_vector: list, ip: str = None, file_hash: str = None, limit: int = 10) -> List[NormalizedAlert]:
        """
        Hybrid Semantic RAG: Finds historical alerts conceptually similar to the query, filtered by hard indicators.
        """
        try:
            if not query_vector: return []
            from redis.commands.search.query import Query

            filters = []
            if ip:
                esc = self._escape_tag(ip)
                filters.append(f"(@src_ip:{{{esc}}} | @dst_ip:{{{esc}}})")
            if file_hash:
                esc_hash = self._escape_tag(file_hash)
                filters.append(f"(@file_hash:{{{esc_hash}}})")

            base_filter = " & ".join(filters) if filters else "*"

            q_str = f"{base_filter}=>[KNN {limit} @embedding $vec AS score]"
            q = Query(q_str).sort_by("score").return_fields("score", "$").dialect(2)
            query_vector_bytes = np.array(query_vector, dtype=np.float32).tobytes()
            
            res = await self.redis.ft("idx:alerts").search(q, query_params={"vec": query_vector_bytes})
            
            alerts = []
            for doc in res.docs:
                try:
                    payload = getattr(doc, '$')
                    alert_data = json.loads(payload) if isinstance(payload, str) else dict(payload[0] if isinstance(payload, list) else payload)
                    alerts.append(NormalizedAlert(**alert_data))
                except Exception as ex:
                    logger.error(f"Parsing related alert failed: {ex} / payload: {getattr(doc, '$')}")
            return alerts
        except Exception as e:
            logger.error(f"Semantic Search Failed: {e}")
            return []

    async def get_graph_alerts(self, ip_addresses: List[str]) -> List[NormalizedAlert]:
        """
        Entity Retrieval: Finds prior alerts connected to the given IPs.
        """
        try:
            if not ip_addresses: return []
            from redis.commands.search.query import Query

            # Escape dots/special chars so RediSearch tag syntax doesn't break on IP addresses
            tag_queries = [
                f"(@src_ip:{{{self._escape_tag(ip)}}} | @dst_ip:{{{self._escape_tag(ip)}}})"
                for ip in ip_addresses
            ]
            q_str = " | ".join(tag_queries)
            
            q = Query(q_str).sort_by("timestamp", asc=False).paging(0, 50).dialect(2)
            res = await self.redis.ft("idx:alerts").search(q)
            
            alerts = []
            for doc in res.docs:
                try:
                    payload = getattr(doc, '$')
                    alert_data = json.loads(payload) if isinstance(payload, str) else dict(payload[0] if isinstance(payload, list) else payload)
                    alerts.append(NormalizedAlert(**alert_data))
                except Exception:
                    pass
            return alerts
        except Exception as e:
            logger.error(f"Graph Search Failed: {e}")
            return []

    async def get_recent_history(self) -> List[Incident]:
        incidents = []
        try:
            raw_data = await self.redis.lrange("incidents:history", 0, 49)
            for raw_item in raw_data:
                try:
                    incidents.append(Incident.model_validate_json(raw_item))
                except Exception as e:
                    logger.error(f"Failed to parse incident from history: {e}")
            incidents.sort(key=lambda x: (-x.risk_score, -x.created_at.timestamp()))
        except Exception as e:
            logger.error(f"Failed to load incident history: {e}")
        return incidents

    async def save_incident(self, incident: Incident):
        try:
            await self.redis.lpush("incidents:history", incident.model_dump_json())
            await self.redis.ltrim("incidents:history", 0, 49)
            
            context_key = f"context:{incident.source_ip}"
            context_data = {
                "last_incident_id": incident.id,
                "timestamp": incident.created_at.isoformat(),
                "risk_score": incident.risk_score,
                "narrative": incident.narrative,
                "mitre_tactic": incident.mitre_tactic
            }
            await self.redis.set(context_key, json.dumps(context_data))
            await self.redis.expire(context_key, 86400) 
            
            # Broadcast incident wrapped for WebSocket consistency
            ws_payload = {
                "type": "incident",
                "data": incident.model_dump(mode="json")
            }
            await manager.broadcast(json.dumps(ws_payload))
            
        except Exception as e:
            logger.error(f"Failed to save incident: {e}")

    async def get_context(self, ip: str) -> Dict:
        try:
            context_key = f"context:{ip}"
            data = await self.redis.get(context_key)
            if data:
                return json.loads(data)
        except Exception:
            return None
        return None

    async def get_ip_history(self, ip: str) -> Dict:
        """
        Summarize everything the platform has observed involving an IP — used to
        enrich the incident report with an at-a-glance history/reputation panel.
        """
        empty = {"total_alerts": 0, "first_seen": None, "last_seen": None,
                 "techniques": [], "targets": [], "users": [], "prior_incident": None}
        if not ip or ip in ("campaign", "Unknown", "unknown"):
            return empty
        try:
            # Scan the raw alert JSON docs directly (the RediSearch index can
            # desync after bulk deletes; a direct scan is always accurate).
            keys = await self.redis.keys("alert:*")
            matched = []
            for k in keys[:5000]:
                try:
                    doc = await self.redis.json().get(k)
                    if isinstance(doc, list):
                        doc = doc[0] if doc else None
                    if doc and (doc.get("src_ip") == ip or doc.get("dst_ip") == ip):
                        matched.append(doc)
                except Exception:
                    continue
            if not matched:
                return empty
            times = sorted([d.get("timestamp") for d in matched if d.get("timestamp")])
            techniques = sorted({d.get("mitre_technique_id") for d in matched if d.get("mitre_technique_id")})
            targets = sorted({t for d in matched for t in
                              [d.get("dst_ip"), d.get("hostname")] if t and t != ip})
            users = sorted({d.get("user") for d in matched if d.get("user")})
            alerts = matched
            prior = None
            try:
                prior = await self.get_context(ip)
            except Exception:
                prior = None
            return {
                "total_alerts": len(alerts),
                "first_seen": times[0] if times else None,
                "last_seen": times[-1] if times else None,
                "techniques": techniques,
                "targets": targets,
                "users": users,
                "prior_incident": prior,
            }
        except Exception as e:
            logger.error(f"IP history lookup failed for {ip}: {e}")
            return empty


aggregator = AggregatorService()
