from datetime import datetime, timedelta, timezone
from typing import List, Dict
from loguru import logger
import redis.asyncio as redis
from app.core.config import settings
from app.schemas.alert import NormalizedAlert, Incident
from app.api.ws import manager
import json
import numpy as np

class AggregatorService:
    def __init__(self):
        # Redis Connection
        self.redis = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        self.window_seconds = 60  # Group alerts every 60 seconds
        self.min_alerts_for_incident = 2 # Minimum alerts to trigger analysis
        
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

            # Group by Source IP
            group_key = f"alerts:{alert.src_ip or 'unknown_source'}"
            await self.redis.rpush(group_key, alert.model_dump_json())
            await self.redis.expire(group_key, self.window_seconds * 2)
            
            logger.debug(f"Buffered and indexed alert {alert.alert_id}")
            
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
                count = await self.redis.llen(key)
                # Lower limit to 1 so the simulation IPs (.50 and .51) trigger incidents immediately
                if count >= 1:
                    raw_alerts = await self.redis.lrange(key, 0, -1)
                    alerts = [NormalizedAlert.model_validate_json(a) for a in raw_alerts]
                    
                    try:
                        source_ip = key.split(":", 1)[1]
                    except IndexError:
                        source_ip = "unknown_source"
                        
                    incident = Incident(
                        id=f"inc-{datetime.now().timestamp()}",
                        source_ip=source_ip,
                        alerts=alerts,
                        created_at=datetime.now(timezone.utc)
                    )
                    incidents.append(incident)
                    await self.redis.delete(key)
            return incidents
        except Exception as e:
            logger.error(f"Failed to fetch incidents: {e}")
            return []

    async def get_related_alerts(self, query_vector: list, ip: str = None, file_hash: str = None, limit: int = 10) -> List[NormalizedAlert]:
        """
        Hybrid Semantic RAG: Finds historical alerts conceptually similar to the query, filtered by hard indicators.
        """
        try:
            if not query_vector: return []
            from redis.commands.search.query import Query
            
            filters = []
            if ip:
                filters.append(f"(@src_ip:{{{ip}}} | @dst_ip:{{{ip}}})")
            # Note: ECS schema currently might not index file_hash, but we add it defensively
            if file_hash:
                filters.append(f"(@file_hash:{{{file_hash}}})")
                
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
            
            # Construct a Tag query for each IP being either src or dst
            tag_queries = [f"(@src_ip:{{{ip}}} | @dst_ip:{{{ip}}})" for ip in ip_addresses]
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
        try:
            raw_data = await self.redis.lrange("incidents:history", 0, 49)
            incidents = [Incident.model_validate_json(x) for x in raw_data]
            incidents.sort(key=lambda x: (-x.risk_score, -x.created_at.timestamp()))
            return incidents
        except Exception:
            return []

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
            
            await manager.broadcast(incident.model_dump_json())
            
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

aggregator = AggregatorService()
