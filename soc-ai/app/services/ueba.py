import json
from datetime import datetime
from typing import Dict, Any, Optional
from loguru import logger
import redis.asyncio as redis
from app.core.config import settings
from app.schemas.alert import NormalizedAlert

class UEBAService:
    def __init__(self):
        # We reuse the same Redis URL as the aggregator
        self.redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            health_check_interval=30,
            socket_keepalive=True,
        )
        self._available = True

    async def update_profile(self, alert: NormalizedAlert):
        """
        Updates the local behavioral baseline for a user/host based on a new alert.
        """
        try:
            if not alert.user:
                return

            username = alert.user.lower()
            pipeline = self.redis.pipeline()
            
            # Record known source IPs
            if alert.src_ip:
                pipeline.sadd(f"ueba:user:{username}:ips", alert.src_ip)
                
            # Record known destination IPs (Blast Radius)
            if alert.dst_ip:
                pipeline.sadd(f"ueba:user:{username}:dst_ips", alert.dst_ip)
                
            # Record known hostnames (Blast Radius)
            if alert.hostname:
                pipeline.sadd(f"ueba:user:{username}:hosts", alert.hostname)
            
            # Record access hours (0-23)
            if alert.timestamp:
                hour_of_day = alert.timestamp.hour
                pipeline.hincrby(f"ueba:user:{username}:hours", str(hour_of_day), 1)
            
            # Record process execution
            if alert.process_name:
                pipeline.sadd(f"ueba:user:{username}:processes", alert.process_name)
                
            # Execute pipeline
            await pipeline.execute()

        except Exception as e:
            logger.error(f"UEBA update failed: {e}")

    async def evaluate(self, alert: NormalizedAlert) -> tuple[float, list]:
        """
        READ-ONLY anomaly evaluation. Compares the alert against the user's
        established baseline and returns (score, reasons) WITHOUT mutating the
        baseline. Detection must never learn — otherwise scoring an attacker's
        first event would silently whitelist it and suppress the very anomaly
        we are trying to surface.
        """
        score = 0.0
        reasons: list = []
        if not alert.user:
            return score, reasons

        username = alert.user.lower()
        try:
            has_baseline = await self.redis.exists(f"ueba:user:{username}:ips")
            if not has_baseline:
                # No established baseline -> first time this identity is seen.
                logger.info(f"UEBA: New user detected '{username}'")
                score += 0.8
                reasons.append(
                    f"First time user '{username}' has been observed on the network "
                    f"(no established behavioral baseline)."
                )
                return min(1.0, score), reasons

            # New source IP — strongest signal for credential abuse / brute force.
            if alert.src_ip and not await self.redis.sismember(f"ueba:user:{username}:ips", alert.src_ip):
                score += 0.5
                reasons.append(
                    f"Source IP {alert.src_ip} is new for this user — never seen in the baseline."
                )

            # New destination IP — possible lateral movement target.
            if alert.dst_ip and await self.redis.exists(f"ueba:user:{username}:dst_ips"):
                if not await self.redis.sismember(f"ueba:user:{username}:dst_ips", alert.dst_ip):
                    score += 0.2
                    reasons.append(
                        f"Destination {alert.dst_ip} is outside this user's normal access pattern."
                    )

            # New host footprint.
            if alert.hostname and await self.redis.exists(f"ueba:user:{username}:hosts"):
                if not await self.redis.sismember(f"ueba:user:{username}:hosts", alert.hostname):
                    score += 0.2
                    reasons.append(
                        f"Host '{alert.hostname}' is not part of this user's normal footprint."
                    )

            # Unusual hour-of-day.
            if alert.timestamp:
                hour = str(alert.timestamp.hour)
                hours_data = await self.redis.hgetall(f"ueba:user:{username}:hours")
                if hours_data:
                    total_logins = sum(int(count) for count in hours_data.values())
                    hour_count = int(hours_data.get(hour, 0))
                    if total_logins > 10 and hour_count == 0:
                        score += 0.4
                        reasons.append(
                            f"Activity at {hour}:00 UTC is outside this user's established working hours."
                        )

            # Unusual process.
            if alert.process_name and await self.redis.exists(f"ueba:user:{username}:processes"):
                if not await self.redis.sismember(f"ueba:user:{username}:processes", alert.process_name):
                    score += 0.3
                    reasons.append(
                        f"Process '{alert.process_name}' is unusual for this user."
                    )

        except Exception as e:
            logger.error(f"UEBA evaluate failed: {e}")

        return min(1.0, score), reasons

    async def calculate_anomaly(self, alert: NormalizedAlert) -> float:
        """
        Returns the anomaly score (0.0 - 1.0). Pure / read-only: it does NOT
        update the baseline. Learning is performed explicitly by the ingestor
        and only for non-anomalous behavior (see ingestor._wazuh_loop).
        """
        score, _ = await self.evaluate(alert)
        return score

    async def get_anomaly_report(self, username: str, alert: NormalizedAlert) -> str:
        """
        Returns a textual explanation of the user's anomalies for the LLM context.
        """
        if not username:
            return "No username provided for behavioral analysis."
            
        try:
            username = username.lower()

            # Prefer the verdict captured at ingestion time — it was computed
            # against the baseline *before* any learning, so it is immune to
            # baseline drift. Fall back to a fresh read-only evaluation (e.g. for
            # directly-injected simulation alerts that never hit the ingestor).
            if alert.ueba_anomalies:
                reasons = list(alert.ueba_anomalies)
                score = alert.ueba_score if alert.ueba_score is not None else 0.8
            else:
                score, reasons = await self.evaluate(alert)
                if alert.ueba_score is not None:
                    score = alert.ueba_score

            if score == 0.0 and not reasons:
                return f"BEHAVIORAL ANALYSIS for '{username}': Normal behavior. Matches established baseline."

            if not reasons:
                reasons.append("Anomalous deviation from established baseline detected.")

            base_report = (
                f"BEHAVIORAL ANALYSIS for '{username}' (Anomaly Score: {score:.2f}):\n"
                + "\n".join([f"- ANOMALY: {r}" for r in reasons])
            )

            blast_radius = await self.get_blast_radius_report(username)
            return base_report + f"\n\n{blast_radius}"

        except Exception as e:
            logger.error(f"UEBA report failed: {e}")
            return "Behavioral Analysis Unavailable (Redis Error)."

    async def get_blast_radius_report(self, username: str) -> str:
        """
        Returns a textual explanation of the user's known access map.
        """
        if not username:
            return "No Blast Radius context available."
        
        try:
            username = username.lower()
            dst_ips = await self.redis.smembers(f"ueba:user:{username}:dst_ips")
            hosts = await self.redis.smembers(f"ueba:user:{username}:hosts")
            
            radius = []
            if dst_ips:
                radius.append(f"Destination IPs: {', '.join(dst_ips)}")
            if hosts:
                radius.append(f"Hosts: {', '.join(hosts)}")
                
            if not radius:
                return "No explicit Blast Radius mapping found in baseline."
                
            return f"BLAST RADIUS MAPPING for '{username}': This user typically has access to the following resources -> " + " | ".join(radius)
        except Exception as e:
            logger.error(f"Blast Radius report failed: {e}")
            return "Blast Radius Context Unavailable."

ueba_service = UEBAService()
