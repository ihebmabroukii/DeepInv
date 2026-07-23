from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional
from app.services.auth_service import (
    login, get_user_by_token, get_all_users, create_user, delete_user,
    init_db, write_audit_log, get_audit_logs
)

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateUserRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: str
    role: str = "soc_analyst"
    region: str = "global"
    department: str = "security"

@router.on_event("startup")
async def startup():
    init_db()

@router.post("/login")
async def auth_login(req: LoginRequest, request: Request):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")
    result, error = login(req.email, req.password, ip_address=ip, user_agent=ua)
    if error:
        raise HTTPException(status_code=401, detail=error)
    return result

@router.post("/logout")
async def auth_logout(authorization: Optional[str] = Header(None), request: Request = None):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user = get_user_by_token(token)
        if user:
            ip = request.client.host if request and request.client else None
            ua = request.headers.get("user-agent", "") if request else None
            write_audit_log(
                user_id=user["id"], user_email=user["email"], user_role=user["role"],
                action="logout", details={}, ip_address=ip, user_agent=ua
            )
    return {"status": "logged_out"}

@router.get("/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user

@router.get("/users")
async def list_users(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    user = get_user_by_token(token)
    if not user or user.get("role") not in ("super_admin", "soc_expert"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return get_all_users()

@router.post("/users")
async def add_user(req: CreateUserRequest, authorization: Optional[str] = Header(None), request: Request = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    caller = get_user_by_token(token)
    if not caller or caller.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can create users")
    ok, error = create_user(req.email, req.username, req.password, req.full_name, req.role, req.region, req.department)
    if not ok:
        raise HTTPException(status_code=400, detail=error)
    ip = request.client.host if request and request.client else None
    write_audit_log(
        user_id=caller["id"], user_email=caller["email"], user_role=caller["role"],
        action="create_user", resource_type="user", resource_id=req.email,
        details={"created_role": req.role, "created_email": req.email}, ip_address=ip
    )
    return {"status": "created"}

@router.delete("/users/{user_id}")
async def remove_user(user_id: str, authorization: Optional[str] = Header(None), request: Request = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    caller = get_user_by_token(token)
    if not caller or caller.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can delete users")
    ip = request.client.host if request and request.client else None
    write_audit_log(
        user_id=caller["id"], user_email=caller["email"], user_role=caller["role"],
        action="delete_user", resource_type="user", resource_id=user_id,
        details={}, ip_address=ip
    )
    delete_user(user_id)
    return {"status": "deleted"}

# ── Audit Log Endpoint ────────────────────────────────────────────────────────
@router.get("/audit/logs")
async def get_audit_log_entries(
    limit: int = 200,
    action: Optional[str] = None,
    user: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    caller = get_user_by_token(token)
    if not caller or caller.get("role") not in ("super_admin", "soc_expert"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    logs = get_audit_logs(limit=limit, action_filter=action, user_filter=user)
    return {"logs": logs, "total": len(logs)}


class AuditEventRequest(BaseModel):
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[dict] = None


# Actions an authenticated analyst may record from the dashboard (allow-list so
# the endpoint can't be used to forge arbitrary audit entries like logins).
ALLOWED_CLIENT_ACTIONS = {
    "download_report",
    "view_incident",
    "export_audit",
    "acknowledge_incident",
}


@router.post("/audit/event")
async def record_audit_event(
    req: AuditEventRequest,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """Record a dashboard-driven action (who downloaded/opened/handled what)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    user = get_user_by_token(authorization.split(" ", 1)[1])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if req.action not in ALLOWED_CLIENT_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported audit action '{req.action}'")
    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent", "") if request else None
    write_audit_log(
        user_id=user["id"], user_email=user["email"], user_role=user["role"],
        action=req.action, resource_type=req.resource_type, resource_id=req.resource_id,
        details=req.details or {}, ip_address=ip, user_agent=ua,
    )
    return {"status": "recorded"}
