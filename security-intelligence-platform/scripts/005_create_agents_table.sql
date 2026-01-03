-- Create agents table for super admin management
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('threat_detection', 'anomaly_detection', 'vulnerability_scanner', 'log_analyzer', 'network_monitor')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'maintenance')),
  description TEXT,
  version TEXT,
  last_heartbeat TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  region region,
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
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some sample agents
INSERT INTO public.agents (name, type, status, description, version, last_heartbeat, region)
VALUES
  ('ThreatGuard AI', 'threat_detection', 'active', 'ML-powered threat detection and classification', 'v2.1.0', NOW(), 'global'),
  ('AnomalyWatch', 'anomaly_detection', 'active', 'Behavioral anomaly detection system', 'v1.8.3', NOW() - INTERVAL '5 minutes', 'us_east'),
  ('VulnScanner Pro', 'vulnerability_scanner', 'inactive', 'Automated vulnerability assessment', 'v3.0.1', NOW() - INTERVAL '2 hours', 'eu_central'),
  ('LogSentry', 'log_analyzer', 'error', 'Real-time log analysis and correlation', 'v2.5.0', NOW() - INTERVAL '30 minutes', 'us_west'),
  ('NetMonitor', 'network_monitor', 'active', 'Network traffic analysis and monitoring', 'v1.9.2', NOW(), 'asia_pacific');
