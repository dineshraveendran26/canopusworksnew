-- Fix RLS policies for tasks to allow authenticated users to see all tasks during development
-- Migration: 021_fix_task_rls_for_development.sql

-- Drop the restrictive RLS policy
DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;

-- Create a more permissive policy for development
CREATE POLICY "Allow authenticated users to view all tasks" ON public.tasks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Also allow authenticated users to create tasks
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;

CREATE POLICY "Allow authenticated users to create tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update tasks
DROP POLICY IF EXISTS "Users can update relevant tasks" ON public.tasks;

CREATE POLICY "Allow authenticated users to update tasks" ON public.tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete tasks
CREATE POLICY "Allow authenticated users to delete tasks" ON public.tasks
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix RLS policies for subtasks
DROP POLICY IF EXISTS "Users can view relevant subtasks" ON public.subtasks;

CREATE POLICY "Allow authenticated users to view all subtasks" ON public.subtasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create subtasks" ON public.subtasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update subtasks" ON public.subtasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete subtasks" ON public.subtasks
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix RLS policies for comments
CREATE POLICY "Allow authenticated users to view all comments" ON public.comments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update comments" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Allow authenticated users to delete comments" ON public.comments
  FOR DELETE USING (auth.uid() = author_id); 