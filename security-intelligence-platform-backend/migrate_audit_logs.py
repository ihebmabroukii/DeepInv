import psycopg2
from app.local_db import LocalClient

print("[*] Starting Audit Logs Migration...")
client = LocalClient()

try:
    conn = psycopg2.connect(client.db_url)
    cursor = conn.cursor()
    
    print(" -> Creating 'audit_logs' table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            user_email TEXT,
            user_role TEXT,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id TEXT,
            details JSONB DEFAULT '{}'::jsonb,
            ip_address TEXT,
            user_agent TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    """)
    
    conn.commit()
    conn.close()
    print("[OK] Audit Logs Migration Complete.")
    
except Exception as e:
    print(f"[ERROR] Migration Failed: {e}")
