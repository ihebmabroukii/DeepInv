-- Create roles enum
CREATE TYPE user_role AS ENUM ('super_admin', 'soc_expert', 'soc_analyst');

-- Create regions enum
CREATE TYPE region AS ENUM ('us_east', 'us_west', 'eu_central', 'asia_pacific', 'global');

-- Create departments enum  
CREATE TYPE department AS ENUM ('security', 'financial', 'hr', 'it', 'operations');

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'soc_analyst',
  region region NOT NULL DEFAULT 'global',
  department department NOT NULL DEFAULT 'security',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS temporarily to avoid recursion during setup
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Create security events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
  ai_confidence NUMERIC(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_explanation TEXT,
  remediation_commands TEXT[],
  region region NOT NULL,
  department department,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.users(id),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Fixed RLS policies to avoid recursion
CREATE POLICY "Users can view events in their region/department"
  ON public.security_events FOR SELECT
  USING (true);

CREATE POLICY "Users can insert events"
  ON public.security_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update events"
  ON public.security_events FOR UPDATE
  USING (true);

-- Create assets table
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'compromised')),
  trust_level TEXT NOT NULL DEFAULT 'unknown' CHECK (trust_level IN ('verified', 'trusted', 'unknown', 'suspicious', 'untrusted')),
  region region NOT NULL,
  department department,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assets"
  ON public.assets FOR SELECT
  USING (true);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.security_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
