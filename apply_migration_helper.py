
import os
import supabase
from dotenv import load_dotenv

# Load environment variables
load_dotenv('security-intelligence-platform-backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in environment.")
    exit(1)

client = supabase.create_client(url, key)

sql_script = """
-- Drop existing table
DROP TABLE IF EXISTS public.agents;

-- Create enhanced agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('endpoint_agent', 'network_sensor', 'cloud_vm_agent', 'container_k8s_agent')),
  capabilities JSONB DEFAULT '[]'::jsonb,
  trust_score INTEGER DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  trust_configuration JSONB DEFAULT '{}'::jsonb,
  environment TEXT NOT NULL CHECK (environment IN ('prod', 'staging', 'lab')),
  criticality TEXT NOT NULL CHECK (criticality IN ('low', 'medium', 'high')),
  region TEXT NOT NULL,
  network_zone TEXT CHECK (network_zone IN ('internal', 'dmz', 'cloud')),
  tags JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'maintenance', 'pending')),
  version TEXT,
  last_heartbeat TIMESTAMPTZ,
  metrics JSONB DEFAULT '{}'::jsonb,
  install_command TEXT,
  token TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Note: Policies creation might fail if user roles aren't set up exactly as expected in the script context, 
-- but table creation is the priority. 
-- We will attempt to run them, but wrap in a block if we were using raw SQL. 
-- Here we are using RPC if available or just relying on the fact this tool has limited SQL execution capability via client.
-- Supabase-js/py client doesn't support raw SQL execution directly on the public interface easily without an RPC function.
-- However, for the purpose of this task, I will assume the user might need to run this manually in the Supabase Dashboard 
-- if I can't execute it here. 
"""

print("NOTE: The Python Supabase client cannot execute raw SQL directly without a helper RPC function.")
print("Please execute the contents of 'security-intelligence-platform/scripts/006_update_agents_table.sql' in your Supabase SQL Editor.")
