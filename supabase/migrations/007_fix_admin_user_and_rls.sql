-- Migration: 007_fix_admin_user_and_rls.sql
-- Fix admin user profile and RLS policies

-- First, let's ensure the admin user exists in auth.users (if not, we'll need to create it manually)
-- For now, let's focus on fixing the profile and RLS issues

-- Drop and recreate RLS policies to fix any conflicts
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow new user registration" ON public.users;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (
    id = auth.uid()
  );

-- Allow users to update their own profile (but not role or approval status)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (
    id = auth.uid()
  ) WITH CHECK (
    id = auth.uid()
  );

-- Allow new user registration
CREATE POLICY "Allow new user registration" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- Admins can do everything
CREATE POLICY "Admins have full access to users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Ensure the create_user_profile function works correctly
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID, user_email TEXT, user_full_name TEXT, user_initials TEXT,
  user_role TEXT, user_department TEXT, user_phone TEXT DEFAULT NULL,
  user_location TEXT DEFAULT NULL, user_join_date DATE DEFAULT CURRENT_DATE,
  user_status TEXT DEFAULT 'active', user_avatar_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  notification_id UUID;
  admin_user_id UUID;
BEGIN
  -- Check if user is authenticated and matches the user_id
  IF auth.uid() IS NULL OR auth.uid() != user_id THEN 
    RAISE EXCEPTION 'Unauthorized: can only create own profile';
  END IF;
  
  -- Insert user profile
  INSERT INTO public.users (id, email, full_name, initials, role, department, phone, location, join_date, status, avatar_url, approval_status)
  VALUES (user_id, user_email, user_full_name, user_initials, user_role::user_role, user_department, user_phone, user_location, user_join_date, user_status::user_status, user_avatar_url, 'pending');
  
  -- Try to create admin notification (only if there's an admin user)
  BEGIN
    SELECT id INTO admin_user_id FROM public.users 
    WHERE email = 'dineshraveendran26@gmail.com' AND role = 'administrator' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
      SELECT public.create_admin_notification(
        'user_registration',
        'New User Registration',
        'New user ' || user_full_name || ' (' || user_email || ') has registered and is waiting for approval.',
        user_id,
        user_id
      ) INTO notification_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If notification creation fails, just log it and continue
    RAISE WARNING 'Could not create admin notification: %', SQLERRM;
  END;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'Error creating user profile: %', SQLERRM; 
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;

-- Ensure the admin user profile exists and is properly configured
-- This will update the existing admin user if it exists, or create a new one
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
  COALESCE(
    (SELECT id FROM public.users WHERE email = 'dineshraveendran26@gmail.com' LIMIT 1),
    uuid_generate_v4()
  ),
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

-- Ensure all necessary permissions exist
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