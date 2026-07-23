from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.schemas.alert import RawAlert, Incident, NormalizedAlert
from app.services.aggregator import aggregator
from app.services.normalizer import normalizer
from app.services.ueba import ueba_service

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/incidents", response_model=list[Incident])
async def get_recent_incidents():
    """
    Returns the latest analyzed incidents for the dashboard feed.
    (Currently mocks logic using Redis or in-memory cache)
    """
    # Return completed incidents and any currently pending groups so the dashboard
    # can show recent and in-flight incident reports while analysis is still running.
    history = await aggregator.get_recent_history()
    pending = []
    try:
        pending = await aggregator.get_pending_incident_groups()
    except Exception:
        pending = []

    # Deduplicate by ID and preserve history order, then append active pending groups.
    history_ids = {inc.id for inc in history}
    combined = list(history)
    for inc in pending:
        if inc.id not in history_ids:
            combined.append(inc)
    # Drop noise "campaigns" formed from alerts with no source IP (benign host
    # events like "service scheduled"). They aren't attacker campaigns, clutter
    # the feed, and leak the "campaign" placeholder into MITRE/remediation.
    combined = [
        inc for inc in combined
        if getattr(inc, "campaign_id", "") != "cmp-unknown"
        and getattr(inc, "source_ip", "") != "campaign"
    ]
    # Newest first so the dashboard (Security Events, Report Center) surfaces the
    # latest AI-analyzed incidents instead of an unsorted history+pending order.
    combined.sort(key=lambda inc: getattr(inc, "created_at", "") or "", reverse=True)
    return combined

@router.get("/raw", response_model=list[NormalizedAlert])
async def get_raw_alerts():
    """
    Returns the latest raw/normalized alerts from the Redis queue.
    """
    try:
        raw_data = await aggregator.redis.lrange("alerts:history", 0, 199)
        alerts = []
        for x in raw_data:
            try:
                alerts.append(NormalizedAlert.model_validate_json(x))
            except Exception:
                pass
        return alerts
    except Exception as e:
        from loguru import logger
        logger.error(f"Failed to fetch raw alerts: {e}")
        return []

@router.get("/ueba/profiles", response_model=list)
async def get_ueba_profiles():
    """
    Returns full UEBA behavioral profiles for all tracked users from Redis.
    """
    try:
        redis_client = ueba_service.redis
        # Find all user namespaces
        all_keys = await redis_client.keys("ueba:user:*")
        usernames = set()
        for key in all_keys:
            parts = key.split(":")
            if len(parts) >= 3:
                usernames.add(parts[2])

        profiles = []
        for username in sorted(usernames):
            ips = list(await redis_client.smembers(f"ueba:user:{username}:ips") or [])
            dst_ips = list(await redis_client.smembers(f"ueba:user:{username}:dst_ips") or [])
            processes = list(await redis_client.smembers(f"ueba:user:{username}:processes") or [])
            hosts = list(await redis_client.smembers(f"ueba:user:{username}:hosts") or [])
            hours_raw = await redis_client.hgetall(f"ueba:user:{username}:hours") or {}
            hours = {k: int(v) for k, v in hours_raw.items()}

            # Baseline IPs are the ones that appeared most (heuristic: appeared >= 3 times)
            # Since ips is a set we treat all pre-attack IPs as the first one added
            # Flag external/unusual IPs vs internal ones
            internal_ips = [ip for ip in ips if ip.startswith(("10.", "192.168.", "172."))]
            external_ips = [ip for ip in ips if not ip.startswith(("10.", "192.168.", "172."))]

            # Peak hours (hours with > 0 activity)
            active_hours = sorted([int(h) for h in hours.keys()])
            off_hours = [h for h in active_hours if h < 6 or h > 22]

            # Known suspicious processes
            suspicious_procs = [p for p in processes if any(
                kw in p.lower() for kw in ["mimikatz", "psexec", "cobalt", "meterpreter", "nc.exe",
                                            "netcat", "powershell -enc", "vssadmin", "wce.exe",
                                            "procdump", "lazagne", "bloodhound", "sharphound"]
            )]

            anomaly_score = 0.0
            if external_ips:
                anomaly_score += 0.4
            if off_hours:
                anomaly_score += 0.3
            if suspicious_procs:
                anomaly_score += 0.5
            if len(dst_ips) > 3:
                anomaly_score += 0.2
            anomaly_score = min(1.0, anomaly_score)

            profiles.append({
                "username": username,
                "anomaly_score": round(anomaly_score, 2),
                "known_ips": ips,
                "internal_ips": internal_ips,
                "external_ips": external_ips,
                "destination_ips": dst_ips,
                "known_processes": processes,
                "suspicious_processes": suspicious_procs,
                "known_hosts": hosts,
                "active_hours": active_hours,
                "off_hours_activity": off_hours,
                "hours_breakdown": hours,
                "total_activity_events": sum(hours.values()),
            })

        # Sort by anomaly score descending
        profiles.sort(key=lambda x: -x["anomaly_score"])
        return profiles
    except Exception as e:
        from loguru import logger
        logger.error(f"UEBA profiles fetch failed: {e}")
        return []


@router.post("/manual", response_model=dict)
async def receive_manual_alert(alert: RawAlert):
    """
    Endpoint to manually push an alert (e.g., from a test script or webhook).
    """
    try:
        # Normalize
        normalized = await normalizer.process(alert)
        
        # Calculate UEBA Score
        if normalized.user:
            normalized.ueba_score = await ueba_service.calculate_anomaly(normalized)
            
        # Aggregate
        await aggregator.ingest(normalized)
        return {"status": "processed", "id": normalized.alert_id}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
