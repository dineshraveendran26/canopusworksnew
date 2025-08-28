-- Migration: 002_user_roles_and_permissions.sql
-- Add user roles and permissions system

-- Create user role enum
CREATE TYPE user_role AS ENUM ('administrator', 'manager', 'viewer');

-- Add role column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'viewer';

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  resource VARCHAR(100) NOT NULL, -- 'tasks', 'subtasks', 'users', 'machines', etc.
  action VARCHAR(100) NOT NULL, -- 'create', 'read', 'update', 'delete'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, resource, action)
);

-- Insert default permissions
INSERT INTO public.permissions (role, resource, action) VALUES
  -- Administrator permissions (full access)
  ('administrator', 'tasks', 'create'),
  ('administrator', 'tasks', 'read'),
  ('administrator', 'tasks', 'update'),
  ('administrator', 'tasks', 'delete'),
  ('administrator', 'subtasks', 'create'),
  ('administrator', 'subtasks', 'read'),
  ('administrator', 'subtasks', 'update'),
  ('administrator', 'subtasks', 'delete'),
  ('administrator', 'users', 'create'),
  ('administrator', 'users', 'read'),
  ('administrator', 'users', 'update'),
  ('administrator', 'users', 'delete'),
  ('administrator', 'machines', 'create'),
  ('administrator', 'machines', 'read'),
  ('administrator', 'machines', 'update'),
  ('administrator', 'machines', 'delete'),
  ('administrator', 'production_batches', 'create'),
  ('administrator', 'production_batches', 'read'),
  ('administrator', 'production_batches', 'update'),
  ('administrator', 'production_batches', 'delete'),
  ('administrator', 'comments', 'create'),
  ('administrator', 'comments', 'read'),
  ('administrator', 'comments', 'update'),
  ('administrator', 'comments', 'delete'),
  ('administrator', 'attachments', 'create'),
  ('administrator', 'attachments', 'read'),
  ('administrator', 'attachments', 'update'),
  ('administrator', 'attachments', 'delete'),

  -- Manager permissions (no user management, but full task access)
  ('manager', 'tasks', 'create'),
  ('manager', 'tasks', 'read'),
  ('manager', 'tasks', 'update'),
  ('manager', 'tasks', 'delete'),
  ('manager', 'subtasks', 'create'),
  ('manager', 'subtasks', 'read'),
  ('manager', 'subtasks', 'update'),
  ('manager', 'subtasks', 'delete'),
  ('manager', 'users', 'read'),
  ('manager', 'users', 'update'),
  ('manager', 'machines', 'create'),
  ('manager', 'machines', 'read'),
  ('manager', 'machines', 'update'),
  ('manager', 'machines', 'delete'),
  ('manager', 'production_batches', 'create'),
  ('manager', 'production_batches', 'read'),
  ('manager', 'production_batches', 'update'),
  ('manager', 'production_batches', 'delete'),
  ('manager', 'comments', 'create'),
  ('manager', 'comments', 'read'),
  ('manager', 'comments', 'update'),
  ('manager', 'comments', 'delete'),
  ('manager', 'attachments', 'create'),
  ('manager', 'attachments', 'read'),
  ('manager', 'attachments', 'update'),
  ('manager', 'attachments', 'delete'),

  -- Viewer permissions (read-only)
  ('viewer', 'tasks', 'read'),
  ('viewer', 'subtasks', 'read'),
  ('viewer', 'users', 'read'),
  ('viewer', 'machines', 'read'),
  ('viewer', 'production_batches', 'read'),
  ('viewer', 'comments', 'read'),
  ('viewer', 'attachments', 'read');

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_id UUID,
  resource_name VARCHAR(100),
  action_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  
  -- Check if user has permission
  RETURN EXISTS (
    SELECT 1 FROM public.permissions 
    WHERE role = user_role 
    AND resource = resource_name 
    AND action = action_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to use role-based permissions
DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update relevant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;

-- New RLS policies based on permissions
CREATE POLICY "Users can view tasks based on permissions" ON public.tasks
  FOR SELECT USING (
    public.check_user_permission(auth.uid(), 'tasks', 'read')
  );

CREATE POLICY "Users can create tasks based on permissions" ON public.tasks
  FOR INSERT WITH CHECK (
    public.check_user_permission(auth.uid(), 'tasks', 'create')
  );

CREATE POLICY "Users can update tasks based on permissions" ON public.tasks
  FOR UPDATE USING (
    public.check_user_permission(auth.uid(), 'tasks', 'update')
  );

CREATE POLICY "Users can delete tasks based on permissions" ON public.tasks
  FOR DELETE USING (
    public.check_user_permission(auth.uid(), 'tasks', 'delete')
  );

-- Similar policies for other tables
-- Subtasks
DROP POLICY IF EXISTS "Users can view subtasks" ON public.subtasks;
CREATE POLICY "Users can view subtasks based on permissions" ON public.subtasks
  FOR SELECT USING (
    public.check_user_permission(auth.uid(), 'subtasks', 'read')
  );

CREATE POLICY "Users can create subtasks based on permissions" ON public.subtasks
  FOR INSERT WITH CHECK (
    public.check_user_permission(auth.uid(), 'subtasks', 'create')
  );

CREATE POLICY "Users can update subtasks based on permissions" ON public.subtasks
  FOR UPDATE USING (
    public.check_user_permission(auth.uid(), 'subtasks', 'update')
  );

CREATE POLICY "Users can delete subtasks based on permissions" ON public.subtasks
  FOR DELETE USING (
    public.check_user_permission(auth.uid(), 'subtasks', 'delete')
  );

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view users based on permissions" ON public.users
  FOR SELECT USING (
    public.check_user_permission(auth.uid(), 'users', 'read')
  );

CREATE POLICY "Users can create users based on permissions" ON public.users
  FOR INSERT WITH CHECK (
    public.check_user_permission(auth.uid(), 'users', 'create')
  );

CREATE POLICY "Users can update users based on permissions" ON public.users
  FOR UPDATE USING (
    public.check_user_permission(auth.uid(), 'users', 'update')
  );

CREATE POLICY "Users can delete users based on permissions" ON public.users
  FOR DELETE USING (
    public.check_user_permission(auth.uid(), 'users', 'delete')
  );

-- Machines policies
CREATE POLICY "Users can view machines based on permissions" ON public.machines
  FOR SELECT USING (
    public.check_user_permission(auth.uid(), 'machines', 'read')
  );

CREATE POLICY "Users can create machines based on permissions" ON public.machines
  FOR INSERT WITH CHECK (
    public.check_user_permission(auth.uid(), 'machines', 'create')
  );

CREATE POLICY "Users can update machines based on permissions" ON public.machines
  FOR UPDATE USING (
    public.check_user_permission(auth.uid(), 'machines', 'update')
  );

CREATE POLICY "Users can delete machines based on permissions" ON public.machines
  FOR DELETE USING (
    public.check_user_permission(auth.uid(), 'machines', 'delete')
  );

-- Production batches policies
CREATE POLICY "Users can view production batches based on permissions" ON public.production_batches
  FOR SELECT USING (
    public.check_user_permission(auth.uid(), 'production_batches', 'read')
  );

CREATE POLICY "Users can create production batches based on permissions" ON public.production_batches
  FOR INSERT WITH CHECK (
    public.check_user_permission(auth.uid(), 'production_batches', 'create')
  );

CREATE POLICY "Users can update production batches based on permissions" ON public.production_batches
  FOR UPDATE USING (
    public.check_user_permission(auth.uid(), 'production_batches', 'update')
  );

CREATE POLICY "Users can delete production batches based on permissions" ON public.production_batches
  FOR DELETE USING (
    public.check_user_permission(auth.uid(), 'production_batches', 'delete')
  );

-- Comments policies
CREATE POLICY "Users can view comments based on permissions" ON public.comments
  FOR SELECT USING (
    public.check_user_permission(auth.uid(), 'comments', 'read')
  );

CREATE POLICY "Users can create comments based on permissions" ON public.comments
  FOR INSERT WITH CHECK (
    public.check_user_permission(auth.uid(), 'comments', 'create')
  );

CREATE POLICY "Users can update comments based on permissions" ON public.comments
  FOR UPDATE USING (
    public.check_user_permission(auth.uid(), 'comments', 'update')
  );

CREATE POLICY "Users can delete comments based on permissions" ON public.comments
  FOR DELETE USING (
    public.check_user_permission(auth.uid(), 'comments', 'delete')
  );

-- Attachments policies
CREATE POLICY "Users can view attachments based on permissions" ON public.attachments
  FOR SELECT USING (
    public.check_user_permission(auth.uid(), 'attachments', 'read')
  );

CREATE POLICY "Users can create attachments based on permissions" ON public.attachments
  FOR INSERT WITH CHECK (
    public.check_user_permission(auth.uid(), 'attachments', 'create')
  );

CREATE POLICY "Users can update attachments based on permissions" ON public.attachments
  FOR UPDATE USING (
    public.check_user_permission(auth.uid(), 'attachments', 'update')
  );

CREATE POLICY "Users can delete attachments based on permissions" ON public.attachments
  FOR DELETE USING (
    public.check_user_permission(auth.uid(), 'attachments', 'delete')
  );

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(resource VARCHAR(100), action VARCHAR(100)) AS $$
BEGIN
  RETURN QUERY
  SELECT p.resource, p.action
  FROM public.permissions p
  JOIN public.users u ON u.role = p.role
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can perform action
CREATE OR REPLACE FUNCTION public.can_user_perform_action(
  user_id UUID,
  resource_name VARCHAR(100),
  action_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.check_user_permission(user_id, resource_name, action_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 