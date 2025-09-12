-- Migration: 006_setup_admin_user.sql
-- Ensure admin user has proper permissions and setup

-- First, let's make sure the admin user exists and has the right role
INSERT INTO public.users (
  id, 
  email, 
  full_name, 
  initials, 
  role, 
  department, 
  phone, 
  location, 
  join_date, 
  status, 
  avatar_url,
  approval_status,
  approved_by,
  approved_at
) VALUES (
  uuid_generate_v4(),
  'dineshraveendran26@gmail.com',
  'Dinesh Raveendran',
  'DR',
  'administrator',
  'Management',
  NULL,
  NULL,
  CURRENT_DATE,
  'active',
  NULL,
  'approved',
  NULL,
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'administrator',
  approval_status = 'approved',
  approved_at = NOW(),
  full_name = 'Dinesh Raveendran',
  initials = 'DR',
  department = 'Management',
  status = 'active';

-- Ensure all necessary permissions exist for administrator role
INSERT INTO public.permissions (role, resource, action) VALUES
  ('administrator', 'users', 'create'),
  ('administrator', 'users', 'read'),
  ('administrator', 'users', 'update'),
  ('administrator', 'users', 'delete'),
  ('administrator', 'tasks', 'create'),
  ('administrator', 'tasks', 'read'),
  ('administrator', 'tasks', 'update'),
  ('administrator', 'tasks', 'delete'),
  ('administrator', 'subtasks', 'create'),
  ('administrator', 'subtasks', 'read'),
  ('administrator', 'subtasks', 'update'),
  ('administrator', 'subtasks', 'delete'),
  ('administrator', 'comments', 'create'),
  ('administrator', 'comments', 'read'),
  ('administrator', 'comments', 'update'),
  ('administrator', 'comments', 'delete'),
  ('administrator', 'machines', 'create'),
  ('administrator', 'machines', 'read'),
  ('administrator', 'machines', 'update'),
  ('administrator', 'machines', 'delete'),
  ('administrator', 'production_batches', 'create'),
  ('administrator', 'production_batches', 'read'),
  ('administrator', 'production_batches', 'update'),
  ('administrator', 'production_batches', 'delete'),
  ('administrator', 'admin_notifications', 'create'),
  ('administrator', 'admin_notifications', 'read'),
  ('administrator', 'admin_notifications', 'update'),
  ('administrator', 'admin_notifications', 'delete')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Ensure manager permissions exist
INSERT INTO public.permissions (role, resource, action) VALUES
  ('manager', 'tasks', 'create'),
  ('manager', 'tasks', 'read'),
  ('manager', 'tasks', 'update'),
  ('manager', 'tasks', 'delete'),
  ('manager', 'subtasks', 'create'),
  ('manager', 'subtasks', 'read'),
  ('manager', 'subtasks', 'update'),
  ('manager', 'subtasks', 'delete'),
  ('manager', 'comments', 'create'),
  ('manager', 'comments', 'read'),
  ('manager', 'comments', 'update'),
  ('manager', 'comments', 'delete'),
  ('manager', 'machines', 'create'),
  ('manager', 'machines', 'read'),
  ('manager', 'machines', 'update'),
  ('manager', 'machines', 'delete'),
  ('manager', 'production_batches', 'create'),
  ('manager', 'production_batches', 'read'),
  ('manager', 'production_batches', 'update'),
  ('manager', 'production_batches', 'delete')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Ensure viewer permissions exist
INSERT INTO public.permissions (role, resource, action) VALUES
  ('viewer', 'tasks', 'read'),
  ('viewer', 'subtasks', 'read'),
  ('viewer', 'comments', 'read'),
  ('viewer', 'machines', 'read'),
  ('viewer', 'production_batches', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure the admin user can access everything
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies and create new ones
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create new policies that allow admin full access
CREATE POLICY "Admins have full access to users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (
    id = auth.uid()
  );

-- Allow users to update their own profile (but not role or approval status)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (
    id = auth.uid()
  ) WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.users WHERE id = auth.uid()) AND
    approval_status = (SELECT approval_status FROM public.users WHERE id = auth.uid())
  );

-- Allow new user registration
CREATE POLICY "Allow new user registration" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = id
  ); 