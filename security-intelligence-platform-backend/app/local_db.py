
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
        self.filters = []

    def select(self, columns="*"):
        self.query_type = "select"
        self.columns = columns
        return self

    def insert(self, data):
        self.query_type = "insert"
        self.data = data
        return self

    def update(self, data):
        self.query_type = "update"
        self.data = data
        return self

    def delete(self):
        self.query_type = "delete"
        return self
        
    def eq(self, column, value):
        self.filters.append({"column": column, "op": "=", "value": value})
        return self

    def _get_connection(self):
        return psycopg2.connect(self.db_url)

    def execute(self):
        conn = None
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Build WHERE clause
            where_clause = ""
            params = []
            
            # Helper for filtering
            # Note: For update/delete, we process filters after
            # For select, we processed inside. Let's unify.
            
            filter_values = []
            if self.filters:
                clauses = []
                for f in self.filters:
                    clauses.append(f"{f['column']} {f['op']} %s")
                    filter_values.append(f['value'])
                where_clause = "WHERE " + " AND ".join(clauses)

            if self.query_type == "select":
                sql = f"SELECT {self.columns} FROM {self.table} {where_clause}"
                cursor.execute(sql, filter_values)
                result = cursor.fetchall()
                return LocalResponse(data=[dict(r) for r in result])

            elif self.query_type == "insert":
                items = [self.data] if isinstance(self.data, dict) else self.data
                inserted = []
                
                for item in items:
                    row_data = item.copy()
                    
                    if 'id' not in row_data:
                        row_data['id'] = str(uuid.uuid4())
                    
                    for k, v in row_data.items():
                         if isinstance(v, (dict, list)):
                             row_data[k] = json.dumps(v)

                    keys = list(row_data.keys())
                    columns_str = ", ".join(keys)
                    placeholders = ", ".join(["%s"] * len(keys))
                    values = list(row_data.values())
                    
                    sql = f"INSERT INTO {self.table} ({columns_str}) VALUES ({placeholders}) RETURNING *"
                    
                    cursor.execute(sql, values)
                    row = cursor.fetchone()
                    if row:
                        inserted.append(dict(row))

                conn.commit()
                return LocalResponse(data=inserted)
            
            elif self.query_type == "update":
                if not self.data:
                    raise Exception("No data provided for update")
                
                # Prepare SET clause
                set_clauses = []
                update_values = []
                
                # Convert dicts to json strings if needed
                update_data = self.data.copy()
                for k, v in update_data.items():
                     if isinstance(v, (dict, list)):
                         update_data[k] = json.dumps(v)
                         
                for k, v in update_data.items():
                    set_clauses.append(f"{k} = %s")
                    update_values.append(v)
                
                set_sql = ", ".join(set_clauses)
                
                # Combine Update values + Where values
                all_values = update_values + filter_values
                
                sql = f"UPDATE {self.table} SET {set_sql} {where_clause} RETURNING *"
                
                cursor.execute(sql, all_values)
                result = cursor.fetchall()
                conn.commit()
                return LocalResponse(data=[dict(r) for r in result])

            elif self.query_type == "delete":
                if not where_clause:
                     raise Exception("Delete operation requires a WHERE clause (use .eq())")
                
                sql = f"DELETE FROM {self.table} {where_clause} RETURNING *"
                cursor.execute(sql, filter_values)
                row = cursor.fetchone()
                conn.commit()
                return LocalResponse(data=[dict(row)] if row else [])

                
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
                        system_info JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        created_by UUID
                    );

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
                print("Connected to Local PostgreSQL Database")
                return
            except psycopg2.OperationalError as e:
                print(f"Could not connect to Postgres (Attempt {attempt+1}/{max_retries}): {e}")
                time.sleep(wait_time)
            except Exception as e:
                 print(f"Error initializing DB: {e}")
                 break
                 
        print("Warning: Failed to connect to Local DB. Ensure Docker is running.")

    def table(self, name):
        return LocalQueryBuilder(name, self.db_url)
