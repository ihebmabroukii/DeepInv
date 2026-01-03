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

-- Only super admins can manage agents
CREATE POLICY "Super admins can view agents"
  ON public.agents FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super admins can insert agents"
  ON public.agents FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super admins can update agents"
  ON public.agents FOR UPDATE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super admins can delete agents"
  ON public.agents FOR DELETE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
