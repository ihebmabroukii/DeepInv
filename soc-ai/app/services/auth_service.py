"""
SQLite-backed Authentication System for Attijari CyberGuard
No external dependencies — uses Python's built-in sqlite3 + PyJWT
"""
import sqlite3
import hashlib
import hmac
import os
import time
import json
import base64
from pathlib import Path
from typing import Optional

# ─── Config ──────────────────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent.parent.parent / "data" / "users.db"
SECRET_KEY = os.environ.get("JWT_SECRET", "attijari-cyberguard-jwt-secret-2024-DO-NOT-USE-IN-PROD")
TOKEN_EXPIRE_HOURS = 8

# ─── Database Init ────────────────────────────────────────────────────────────
def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize tables and seed default users."""
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'soc_analyst',
            region TEXT DEFAULT 'global',
            department TEXT DEFAULT 'security',
            created_at REAL DEFAULT (strftime('%s','now')),
            is_active INTEGER DEFAULT 1
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            user_email TEXT,
            user_role TEXT,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id TEXT,
            details TEXT DEFAULT '{}',
            ip_address TEXT,
            user_agent TEXT,
            timestamp REAL DEFAULT (strftime('%s','now'))
        )
    """)
    conn.commit()

    # Seed default users
    default_users = [
        ("user-001", "admin@attijari.tn", "admin", "admin123", "Super Admin", "super_admin"),
        ("user-002", "analyst@attijari.tn", "analyst", "analyst123", "SOC Analyst", "soc_analyst"),
        ("user-003", "expert@attijari.tn", "expert", "expert123", "SOC Expert", "soc_expert"),
    ]
    for uid, email, username, password, full_name, role in default_users:
        existing = c.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if not existing:
            pw_hash = hash_password(password)
            c.execute(
                "INSERT INTO users (id, email, username, password_hash, full_name, role) VALUES (?,?,?,?,?,?)",
                (uid, email, username, pw_hash, full_name, role)
            )
    conn.commit()
    conn.close()

# ─── Password Hashing ─────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = "attijari-salt-v1"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(plain), hashed)

# ─── Simple JWT (no external deps) ───────────────────────────────────────────
def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64_decode(data: str) -> bytes:
    padding = 4 - len(data) % 4
    return base64.urlsafe_b64decode(data + "=" * padding)

def create_token(payload: dict) -> str:
    header = _b64_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = {**payload, "iat": int(time.time()), "exp": int(time.time()) + TOKEN_EXPIRE_HOURS * 3600}
    body = _b64_encode(json.dumps(payload).encode())
    sig_input = f"{header}.{body}".encode()
    sig = _b64_encode(hmac.new(SECRET_KEY.encode(), sig_input, hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"

def verify_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, body, sig = parts
        sig_input = f"{header}.{body}".encode()
        expected_sig = _b64_encode(hmac.new(SECRET_KEY.encode(), sig_input, hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(_b64_decode(body))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

# ─── Audit Logging ───────────────────────────────────────────────────────────
def write_audit_log(user_id: str, user_email: str, user_role: str,
                    action: str, resource_type: str = None, resource_id: str = None,
                    details: dict = None, ip_address: str = None, user_agent: str = None):
    import uuid as _uuid
    conn = get_db()
    conn.execute(
        """INSERT INTO audit_logs
           (id, user_id, user_email, user_role, action, resource_type, resource_id, details, ip_address, user_agent, timestamp)
           VALUES (?,?,?,?,?,?,?,?,?,?,strftime('%s','now'))""",
        (str(_uuid.uuid4()), user_id, user_email, user_role, action,
         resource_type, resource_id, json.dumps(details or {}), ip_address, user_agent)
    )
    conn.commit()
    conn.close()

def get_audit_logs(limit: int = 200, action_filter: str = None, user_filter: str = None):
    conn = get_db()
    query = "SELECT * FROM audit_logs"
    params = []
    conditions = []
    if action_filter:
        conditions.append("action = ?")
        params.append(action_filter)
    if user_filter:
        conditions.append("user_email = ?")
        params.append(user_filter)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    result = []
    for r in rows:
        row = dict(r)
        try:
            row["details"] = json.loads(row["details"]) if row["details"] else {}
        except Exception:
            row["details"] = {}
        # Convert unix timestamp to ISO string
        try:
            import datetime
            row["timestamp"] = datetime.datetime.utcfromtimestamp(row["timestamp"]).isoformat() + "Z"
        except Exception:
            pass
        result.append(row)
    return result

# ─── Auth Operations ──────────────────────────────────────────────────────────
def login(email_or_username: str, password: str, ip_address: str = None, user_agent: str = None):
    init_db()
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1",
        (email_or_username, email_or_username)
    ).fetchone()
    conn.close()
    if not user or not verify_password(password, user["password_hash"]):
        # Log failed login
        write_audit_log(
            user_id="unknown", user_email=email_or_username, user_role="unknown",
            action="login_failed", details={"reason": "Invalid credentials"},
            ip_address=ip_address, user_agent=user_agent
        )
        return None, "Invalid credentials"
    token = create_token({"sub": user["id"], "email": user["email"], "role": user["role"]})
    # Log successful login
    write_audit_log(
        user_id=user["id"], user_email=user["email"], user_role=user["role"],
        action="login", details={"method": "password"},
        ip_address=ip_address, user_agent=user_agent
    )
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "region": user["region"],
            "department": user["department"],
        }
    }, None

def get_user_by_token(token: str):
    payload = verify_token(token)
    if not payload:
        return None
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ? AND is_active = 1", (payload["sub"],)).fetchone()
    conn.close()
    if not user:
        return None
    return dict(user)

def get_all_users():
    init_db()
    conn = get_db()
    rows = conn.execute("SELECT id, email, username, full_name, role, region, department, created_at FROM users").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def create_user(email: str, username: str, password: str, full_name: str, role: str, region: str = "global", department: str = "security"):
    init_db()
    conn = get_db()
    try:
        import uuid
        uid = str(uuid.uuid4())
        pw_hash = hash_password(password)
        conn.execute(
            "INSERT INTO users (id, email, username, password_hash, full_name, role, region, department) VALUES (?,?,?,?,?,?,?,?)",
            (uid, email, username, pw_hash, full_name, role, region, department)
        )
        conn.commit()
        return True, None
    except sqlite3.IntegrityError as e:
        return False, "Email or username already exists"
    finally:
        conn.close()

def delete_user(user_id: str):
    conn = get_db()
    conn.execute("UPDATE users SET is_active = 0 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
