
import psycopg2
from app.local_db import LocalClient

print("[*] Starting Tasks Migration...")
client = LocalClient()

try:
    conn = psycopg2.connect(client.db_url)
    cursor = conn.cursor()
    
    print(" -> Creating 'tasks' table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id UUID REFERENCES agents(id),
            type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            payload JSONB DEFAULT '{}'::jsonb,
            result JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    
    conn.commit()
    conn.close()
    print("[OK] Tasks Migration Complete.")
    
except Exception as e:
    print(f"[ERROR] Migration Failed: {e}")
