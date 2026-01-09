import psycopg2
from app.local_db import LocalClient
import bcrypt

print("[*] Starting Users Migration...")
client = LocalClient()

# Hash the password
password = "ihebiheb98661649"
password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

try:
    conn = psycopg2.connect(client.db_url)
    cursor = conn.cursor()
    
    print(" -> Creating 'users' table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'soc_analyst',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    
    print(" -> Creating super admin user...")
    cursor.execute("""
        INSERT INTO users (email, password_hash, name, role) 
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (email) DO UPDATE 
        SET password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role;
    """, ('ihebmabrouki2702@gmail.com', password_hash, 'Iheb Mabrouki', 'super_admin'))
    
    conn.commit()
    conn.close()
    print("[OK] Users Migration Complete.")
    print(f"[OK] Super Admin Created: ihebmabrouki2702@gmail.com")
    
except Exception as e:
    print(f"[ERROR] Migration Failed: {e}")
