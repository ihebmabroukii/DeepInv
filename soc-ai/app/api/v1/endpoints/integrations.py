import ipaddress
import json
import re

from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional

from app.services.thehive_service import thehive_service
from app.services.cortex_service import cortex_service
from app.services.threat_intel import threat_intel
from app.services.aggregator import aggregator
from app.services.auth_service import get_user_by_token, write_audit_log

router = APIRouter()

# A campaign-style incident with no single source IP carries the literal
# placeholder "campaign" (Incident.source_ip default / aggregator fallback).
# Detect what a value actually is so we never push a placeholder to OpenCTI/Cortex.
_DOMAIN_RE = re.compile(r"^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.[A-Za-z0-9-]{1,63})+$")


def detect_observable_type(value: Optional[str]) -> Optional[str]:
    """Return the OpenCTI observable type for a value, or None if it is not a
    pushable indicator (e.g. the 'campaign' / 'Unknown' placeholders)."""
    if not value:
        return None
    v = value.strip()
    try:
        ip = ipaddress.ip_address(v)
        return "IPv6-Addr" if ip.version == 6 else "IPv4-Addr"
    except ValueError:
        pass
    if v.lower().startswith(("http://", "https://")):
        return "Url"
    if _DOMAIN_RE.match(v):
        return "Domain-Name"
    return None


def _actor(authorization: Optional[str]):
    """Resolve the acting user from a Bearer token, or a system fallback."""
    if authorization and authorization.startswith("Bearer "):
        user = get_user_by_token(authorization.split(" ", 1)[1])
        if user:
            return user
    return {"id": "system", "email": "system", "role": "system"}


def _audit(authorization, request, action, resource_type, resource_id, details):
    """Record who performed a SOC integration action and on what."""
    try:
        user = _actor(authorization)
        ip = request.client.host if request and request.client else None
        ua = request.headers.get("user-agent", "") if request else None
        write_audit_log(
            user_id=user["id"], user_email=user["email"], user_role=user["role"],
            action=action, resource_type=resource_type, resource_id=resource_id,
            details=details or {}, ip_address=ip, user_agent=ua,
        )
    except Exception:
        # Auditing must never break the actual integration action.
        pass


class TheHiveRequest(BaseModel):
    incident_id: str
    source_ip: str
    risk_score: int = 50
    narrative: str = ""
    ai_reasoning: str = ""
    ai_recommendations: str = ""
    mitre_tactic: Optional[str] = "Unknown"

class CortexRequest(BaseModel):
    observable: str
    type: str = "ip"

class OpenCTIRequest(BaseModel):
    observable: str
    type: str = "IPv4-Addr"
    description: str = "Added from SOC-AI Dashboard"
    score: int = 50


async def _intel_key(incident_id: str) -> str:
    return f"thehive_case:{incident_id}"


@router.post("/thehive/check-or-create")
async def thehive_action(req: TheHiveRequest, authorization: Optional[str] = Header(None), request: Request = None):
    """Check if a TheHive case already exists for this incident/IP, or create one."""
    cache_key = await _intel_key(req.incident_id)

    # 0. Redis-backed idempotency. TheHive 5.x's search API rejects our query
    #    format, so we remember the case we created for this incident and return
    #    it on repeat clicks — "already created" + a link instead of a duplicate.
    try:
        cached = await aggregator.redis.get(cache_key)
        if cached:
            case = json.loads(cached)
            _audit(authorization, request, "thehive_case", "incident", req.incident_id,
                   {"result": "found", "case_id": case.get("caseId"), "source_ip": req.source_ip})
            return {"action": "found", "case": case}
    except Exception:
        pass

    # 1. Secondary: ask TheHive directly (best-effort; may 400 on v5.x)
    existing_case = await thehive_service.check_case(req.incident_id, req.source_ip)
    if existing_case:
        try:
            await aggregator.redis.set(cache_key, json.dumps(existing_case))
        except Exception:
            pass
        _audit(authorization, request, "thehive_case", "incident", req.incident_id,
               {"result": "found", "case_id": existing_case.get("caseId"), "source_ip": req.source_ip})
        return {"action": "found", "case": existing_case}

    # 2. Build a lightweight incident-like dict and create a case
    new_case = await thehive_service.create_case_from_data(
        incident_id=req.incident_id,
        source_ip=req.source_ip,
        risk_score=req.risk_score,
        narrative=req.narrative,
        ai_reasoning=req.ai_reasoning,
        ai_recommendations=req.ai_recommendations,
        mitre_tactic=req.mitre_tactic or "Unknown"
    )
    if new_case:
        try:
            await aggregator.redis.set(cache_key, json.dumps(new_case))
        except Exception:
            pass
        _audit(authorization, request, "thehive_case", "incident", req.incident_id,
               {"result": "created", "case_id": new_case.get("caseId"), "source_ip": req.source_ip})
        return {"action": "created", "case": new_case}

    raise HTTPException(status_code=500, detail="Failed to create TheHive case. Check that TheHive is running on port 9000.")


@router.post("/cortex/analyze")
async def cortex_action(req: CortexRequest, authorization: Optional[str] = Header(None), request: Request = None):
    """Check if the observable was analyzed recently in Cortex, or trigger a new job."""
    # IP analyzers need a real IP; a placeholder like "campaign" has nothing to analyse.
    if req.type == "ip" and detect_observable_type(req.observable) not in ("IPv4-Addr", "IPv6-Addr"):
        raise HTTPException(
            status_code=400,
            detail=f"'{req.observable}' is not a valid IP address — this incident has no single "
                   f"source IP for Cortex to analyse.",
        )
    cache_key = f"cortex_job:{req.observable}"
    # 0. Redis idempotency: return the previously-triggered job's CURRENT result
    #    (status + report summary), with a link — instead of re-running the analyzer.
    try:
        cached = await aggregator.redis.get(cache_key)
        if cached:
            prev = json.loads(cached)
            refreshed = await cortex_service.get_job(prev.get("id")) or prev
            _audit(authorization, request, "cortex_analysis", "observable", req.observable,
                   {"result": "found", "analyzer": refreshed.get("analyzerName")})
            return {"action": "found", "job": refreshed}
    except Exception:
        pass

    existing_jobs = await cortex_service.check_analysis(req.observable)
    if existing_jobs and len(existing_jobs) > 0:
        try:
            await aggregator.redis.set(cache_key, json.dumps(existing_jobs[0]))
        except Exception:
            pass
        _audit(authorization, request, "cortex_analysis", "observable", req.observable,
               {"result": "found", "analyzer": existing_jobs[0].get("analyzerName")})
        return {"action": "found", "job": existing_jobs[0], "history": existing_jobs}

    # Trigger new analysis
    new_job = await cortex_service.trigger_analysis(req.observable, req.type)
    if new_job:
        try:
            await aggregator.redis.set(cache_key, json.dumps(new_job))
        except Exception:
            pass
        _audit(authorization, request, "cortex_analysis", "observable", req.observable,
               {"result": "triggered", "analyzer": new_job.get("analyzerName")})
        return {"action": "triggered", "job": new_job}

    raise HTTPException(status_code=502, detail="Cortex could not be reached or returned no job. Check that the Cortex container is running and its analyzers are enabled.")


@router.post("/opencti/add")
async def opencti_action(req: OpenCTIRequest, authorization: Optional[str] = Header(None), request: Request = None):
    """Check if the observable exists in OpenCTI, or add it."""
    # Validate BEFORE calling OpenCTI. Placeholder sources like "campaign" / "Unknown"
    # are not real indicators, so return a clear message instead of letting OpenCTI
    # reject them with an opaque "Observable is not correctly formatted" error.
    obs_type = detect_observable_type(req.observable)
    if obs_type is None:
        raise HTTPException(
            status_code=400,
            detail=f"'{req.observable}' is not a valid IP or domain — this incident has no single "
                   f"source indicator to push to OpenCTI.",
        )

    existing = await threat_intel.check_observable(req.observable, obs_type)
    if existing:
        _audit(authorization, request, "opencti_observable", "observable", req.observable,
               {"result": "found", "score": existing.get("x_opencti_score")})
        return {"action": "found", "observable": existing}

    new_obs = await threat_intel.add_observable(req.observable, obs_type, req.description, req.score)
    if new_obs:
        _audit(authorization, request, "opencti_observable", "observable", req.observable,
               {"result": "added", "score": req.score})
        return {"action": "added", "observable": new_obs}

    raise HTTPException(status_code=502, detail="OpenCTI could not be reached or rejected the request. Check that the OpenCTI container is running and the API token is valid.")
