import asyncio
import json
import redis.asyncio as aioredis
from elasticsearch import AsyncElasticsearch
from typing import AsyncGenerator, Dict, Any
from loguru import logger
from datetime import datetime, timezone, timedelta
from app.core.config import settings

WATERMARK_KEY = "so_elastic:watermark"

class SOElasticReader:
    def __init__(self):
        self.es_url = getattr(settings, "SO_ELASTIC_URL", "https://192.168.126.128:9200")
        self.es_user = getattr(settings, "SO_ELASTIC_USER", "so_elastic")
        self.es_pass = getattr(settings, "SO_ELASTIC_PASS", "")

        # elasticsearch 7.x uses http_auth=(user, pass); basic_auth is v8.x-only
        self.es = AsyncElasticsearch(
            self.es_url,
            http_auth=(self.es_user, self.es_pass),
            verify_certs=False,
            ssl_show_warn=False,
        )

        # Security Onion 2.4 ECS data stream indices
        # suricata alerts + SO detection engine alerts
        self.index_pattern = "logs-suricata.alerts-so,logs-detections.alerts-so"

        # Default watermark — will be overridden by Redis-persisted value on first poll
        self._default_watermark = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        self.last_timestamp = self._default_watermark

        # Redis client to persist watermark across restarts
        self._redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )

    async def poll_alerts(self) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Continuously polls Security Onion Elasticsearch for new Suricata/detection alerts.
        Uses the ECS data stream format (Security Onion 2.4+).
        """
        logger.info(f"Connecting to Security Onion Elasticsearch at {self.es_url}...")

        # Load persisted watermark from Redis (survives restarts)
        try:
            stored = await self._redis.get(WATERMARK_KEY)
            if stored:
                self.last_timestamp = stored
                logger.info(f"SOElasticReader: resumed watermark from Redis: {self.last_timestamp}")
            else:
                logger.info(f"SOElasticReader: no watermark in Redis, seeding from 30 days ago: {self.last_timestamp}")
        except Exception as e:
            logger.warning(f"SOElasticReader: could not load watermark from Redis: {e}")

        while True:
            try:
                info = await self.es.info()
                logger.info(f"Connected to SO Elasticsearch — cluster: {info.get('cluster_name')}, version: {info.get('version', {}).get('number')}")
                break
            except Exception as e:
                logger.warning(f"SO ES connection failed: {type(e).__name__} — {e}. Retrying in 15s...")
                await asyncio.sleep(15)

        while True:
            try:
                query = {
                    "query": {
                        "range": {
                            "@timestamp": {"gt": self.last_timestamp}
                        }
                    },
                    "sort": [{"@timestamp": {"order": "asc"}}],
                    "size": 100,
                    "_source": True
                }

                results = await self.es.search(index=self.index_pattern, body=query)
                hits = results.get("hits", {}).get("hits", [])

                if hits:
                    logger.info(f"SO ES: fetched {len(hits)} new alert(s)")
                    for hit in hits:
                        source = hit.get("_source", {})

                        hit_ts = source.get("@timestamp")
                        if hit_ts and hit_ts > self.last_timestamp:
                            self.last_timestamp = hit_ts
                            # Persist watermark to Redis so restarts don't re-ingest old alerts
                            try:
                                await self._redis.set(WATERMARK_KEY, self.last_timestamp)
                            except Exception:
                                pass

                        # Flatten ECS to the shape our normalizer expects
                        # The _normalize_suricata method reads source.ip, destination.ip, rule.name
                        # which are already present in ECS — just yield source directly.
                        yield source

            except Exception as e:
                logger.error(f"SO ES poll error: {e}")

            await asyncio.sleep(5)

    async def close(self):
        await self.es.close()
        await self._redis.aclose()
