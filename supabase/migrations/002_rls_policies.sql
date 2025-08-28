-- Row Level Security Policies for Canopus Works
-- Migration: 002_rls_policies.sql

-- Users table policies
-- Only administrators can view all users
CREATE POLICY "Administrators can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'administrator'
    )
  );

-- Only administrators can create users
CREATE POLICY "Administrators can create users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'administrator'
    )
  );

-- Only administrators can update users
CREATE POLICY "Administrators can update users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'administrator'
    )
  );

-- Only administrators can delete users
CREATE POLICY "Administrators can delete users" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'administrator'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    -- Users can only update certain fields, not role
    role = OLD.role AND
    created_by = OLD.created_by
  );

-- Team members table policies
-- Administrators and managers can view all team members
CREATE POLICY "Admins and managers can view team members" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can create team members
CREATE POLICY "Admins and managers can create team members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can update team members
CREATE POLICY "Admins and managers can update team members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can delete team members
CREATE POLICY "Admins and managers can delete team members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Tasks table policies
-- All authenticated users can view tasks
CREATE POLICY "All users can view tasks" ON public.tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Administrators and managers can create tasks
CREATE POLICY "Admins and managers can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can update tasks
CREATE POLICY "Admins and managers can update tasks" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can delete tasks
CREATE POLICY "Admins and managers can delete tasks" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Subtasks table policies
-- All authenticated users can view subtasks
CREATE POLICY "All users can view subtasks" ON public.subtasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Administrators and managers can create subtasks
CREATE POLICY "Admins and managers can create subtasks" ON public.subtasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can update subtasks
CREATE POLICY "Admins and managers can update subtasks" ON public.subtasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can delete subtasks
CREATE POLICY "Admins and managers can delete subtasks" ON public.subtasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Task assignments table policies
-- All authenticated users can view task assignments
CREATE POLICY "All users can view task assignments" ON public.task_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Administrators and managers can manage task assignments
CREATE POLICY "Admins and managers can manage task assignments" ON public.task_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Subtask assignments table policies
-- All authenticated users can view subtask assignments
CREATE POLICY "All users can view subtask assignments" ON public.subtask_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Administrators and managers can manage subtask assignments
CREATE POLICY "Admins and managers can manage subtask assignments" ON public.subtask_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Comments table policies
-- All authenticated users can view comments
CREATE POLICY "All users can view comments" ON public.comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Administrators and managers can create comments
CREATE POLICY "Admins and managers can create comments" ON public.comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can update comments
CREATE POLICY "Admins and managers can update comments" ON public.comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- Administrators and managers can delete comments
CREATE POLICY "Admins and managers can delete comments" ON public.comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role IN ('administrator', 'manager')
    )
  );

-- User audit log policies
-- Only administrators can view audit logs
CREATE POLICY "Administrators can view audit logs" ON public.user_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users current_user 
      WHERE current_user.id = auth.uid() 
      AND current_user.role = 'administrator'
    )
  );

-- System can insert audit logs (for triggers)
CREATE POLICY "System can insert audit logs" ON public.user_audit_log
  FOR INSERT WITH CHECK (true); 