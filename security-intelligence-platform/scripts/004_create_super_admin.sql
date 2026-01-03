-- This script creates the super admin user
-- First, the user must register through Supabase Auth, then we update their role

-- Create a function to automatically set super admin role for specific username
CREATE OR REPLACE FUNCTION public.check_and_set_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If the username is 'badi', automatically set as super_admin
  IF NEW.username = 'badi' THEN
    NEW.role = 'super_admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check username and set role
DROP TRIGGER IF EXISTS set_super_admin_trigger ON public.users;
CREATE TRIGGER set_super_admin_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_set_super_admin();

-- Update RLS policies to allow initial super admin creation
-- This policy allows the first user insert even without super admin
DROP POLICY IF EXISTS "Super admins can insert users" ON public.users;
CREATE POLICY "Super admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    -- Allow if user is super admin OR if no users exist yet (first user)
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'super_admin')
  );
