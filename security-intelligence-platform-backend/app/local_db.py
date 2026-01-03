
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import uuid
from config import Config
import time

class LocalResponse:
    def __init__(self, data, error=None):
        self.data = data
        self.error = error

class LocalQueryBuilder:
    def __init__(self, table, db_url):
        self.table = table
        self.db_url = db_url
        self.query_type = None 
        self.data = None
        self.columns = "*"

    def select(self, columns="*"):
        self.query_type = "select"
        self.columns = columns
        return self

    def _get_connection(self):
        return psycopg2.connect(self.db_url)

    def insert(self, data):
        self.query_type = "insert"
        self.data = data
        return self

    def execute(self):
        conn = None
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            if self.query_type == "select":
                cursor.execute(f"SELECT {self.columns} FROM {self.table}")
                result = cursor.fetchall()
                # Psycopg2 returns RealDictRow which is dict-like, jsonify handles it usually, 
                # but we might need to cast to dict explicitly if list required
                return LocalResponse(data=[dict(r) for r in result])

            elif self.query_type == "insert":
                items = [self.data] if isinstance(self.data, dict) else self.data
                inserted = []
                
                for item in items:
                    row_data = item.copy()
                    
                    # Ensure ID if not present
                    if 'id' not in row_data:
                        row_data['id'] = str(uuid.uuid4())
                    
                    # Serialize dicts/lists to JSON strings for compatibility if not using jsonb adapter automatically
                    # psycopg2 handles dict to jsonb if configured, but let's be explicit
                    for k, v in row_data.items():
                         if isinstance(v, (dict, list)):
                             row_data[k] = json.dumps(v)

                    keys = list(row_data.keys())
                    columns = ", ".join(keys)
                    # Postgres uses %s for placeholders
                    placeholders = ", ".join(["%s"] * len(keys))
                    values = list(row_data.values())
                    
                    sql = f"INSERT INTO {self.table} ({columns}) VALUES ({placeholders}) RETURNING *"
                    
                    cursor.execute(sql, values)
                    row = cursor.fetchone()
                    if row:
                        inserted.append(dict(row))

                conn.commit()
                return LocalResponse(data=inserted)
                
        except Exception as e:
            print(f"Local Postgres DB Error: {e}")
            if conn:
                conn.rollback()
            return LocalResponse(data=None, error=str(e))
        finally:
            if conn:
                conn.close()

class LocalClient:
    def __init__(self):
        # Default to the docker settings if env vars not set
        self.db_url = Config.LOCAL_DB_URL or "postgresql://admin:REDACTED@localhost:5432/security_platform"
        self._init_db()

    def _init_db(self):
        max_retries = 5
        wait_time = 2
        
        for attempt in range(max_retries):
            try:
                conn = psycopg2.connect(self.db_url)
                c = conn.cursor()
                
                # Check if agents table exists, if not create it
                # Using Postgres types
                c.execute("""
                    CREATE TABLE IF NOT EXISTS agents (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name TEXT NOT NULL,
                        description TEXT,
                        platform TEXT,
                        capabilities JSONB DEFAULT '[]'::jsonb,
                        trust_score INTEGER,
                        trust_configuration JSONB DEFAULT '{}'::jsonb,
                        environment TEXT,
                        criticality TEXT,
                        region TEXT,
                        network_zone TEXT,
                        tags JSONB DEFAULT '[]'::jsonb,
                        status TEXT DEFAULT 'inactive',
                        version TEXT,
                        last_heartbeat TIMESTAMPTZ,
                        metrics JSONB DEFAULT '{}'::jsonb,
                        install_command TEXT,
                        token TEXT,
                        config JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        created_by UUID
                    );
                """)
                # Enable gen_random_uuid() if needed - actually standard in v13+ but let's ensure extension if needed
                # or just rely on python uuid generation.
                # simpler to just use TEXT for ID if we want to be lazy, but UUID is better. 
                # pgcrypto extension usually needed for gen_random_uuid on older versions.
                # For simplicity, we are generating UUID in python insert method above, so default in DB is backup.
                
                conn.commit()
                conn.close()
                print("✅ Connected to Local PostgreSQL Database")
                return
            except psycopg2.OperationalError as e:
                print(f"⚠️ Could not connect to Postgres (Attempt {attempt+1}/{max_retries}): {e}")
                time.sleep(wait_time)
            except Exception as e:
                 print(f"❌ Error initializing DB: {e}")
                 break
                 
        print("❗ Warning: Failed to connect to Local DB. Ensure Docker is running.")

    def table(self, name):
        return LocalQueryBuilder(name, self.db_url)
