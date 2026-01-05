
import psycopg2
from app.local_db import LocalClient

print("[*] Starting Schema Migration...")
client = LocalClient()

try:
    conn = psycopg2.connect(client.db_url)
    cursor = conn.cursor()
    
    # Add system_info column
    print(" -> Adding 'system_info' column...")
    cursor.execute("ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_info JSONB DEFAULT '{}'::jsonb;")
    
    conn.commit()
    conn.close()
    print("✅ Schema Migration Complete.")
    
except Exception as e:
    print(f"❌ Migration Failed: {e}")
