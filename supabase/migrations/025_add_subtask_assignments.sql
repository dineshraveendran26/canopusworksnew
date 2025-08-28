-- Migration: Add subtask assignment support
-- This migration adds assignment capabilities to subtasks including:
-- 1. Direct assignment to team members
-- 2. Inheritance from parent task assignments
-- 3. Many-to-many relationship support

-- Step 1: Add assignment support to subtasks table
ALTER TABLE public.subtasks 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.team_member(id);

-- Step 2: Create subtask_assignments junction table for many-to-many relationships
CREATE TABLE IF NOT EXISTS public.subtask_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.team_member(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.team_member(id),
  role VARCHAR(50) DEFAULT 'assignee', -- 'assignee', 'reviewer', 'approver', etc.
  UNIQUE(subtask_id, user_id)
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_subtask_id ON public.subtask_assignments(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_user_id ON public.subtask_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_subtask_assignments_assigned_at ON public.subtask_assignments(assigned_at);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON public.subtasks(assigned_to);

-- Step 4: Enable Row Level Security on subtask_assignments
ALTER TABLE public.subtask_assignments ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for subtask_assignments
-- Policy: Users can see assignments for subtasks they have access to
CREATE POLICY "Users can view subtask assignments for accessible subtasks" ON public.subtask_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      JOIN public.tasks t ON s.task_id = t.id
      WHERE s.id = subtask_assignments.subtask_id 
      AND (
        t.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.task_assignments ta 
          WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Users can create assignments for subtasks they created or manage
CREATE POLICY "Users can create subtask assignments for owned/managed subtasks" ON public.subtask_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      JOIN public.tasks t ON s.task_id = t.id
      WHERE s.id = subtask_assignments.subtask_id 
      AND (
        t.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = auth.uid() AND u.role = 'administrator'
        )
      )
    )
  );

-- Policy: Users can update assignments for subtasks they created or manage
CREATE POLICY "Users can update subtask assignments for owned/managed subtasks" ON public.subtask_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      JOIN public.tasks t ON s.task_id = t.id
      WHERE s.id = subtask_assignments.subtask_id 
      AND (
        t.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = auth.uid() AND u.role = 'administrator'
        )
      )
    )
  );

-- Policy: Users can delete assignments for subtasks they created or manage
CREATE POLICY "Users can delete subtask assignments for owned/managed subtasks" ON public.subtask_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      JOIN public.tasks t ON s.task_id = t.id
      WHERE s.id = subtask_assignments.subtask_id 
      AND (
        t.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = auth.uid() AND u.role = 'administrator'
        )
      )
    )
  );

-- Step 6: Create a view for easier querying of subtasks with assignees
CREATE OR REPLACE VIEW public.subtasks_with_assignees AS
SELECT 
  s.*,
  COALESCE(
    ARRAY_AGG(sa.user_id) FILTER (WHERE sa.user_id IS NOT NULL),
    ARRAY[]::UUID[]
  ) as assignee_ids,
  COALESCE(
    ARRAY_AGG(tm.email) FILTER (WHERE tm.email IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) as assignee_emails,
  COALESCE(
    ARRAY_AGG(tm.full_name) FILTER (WHERE tm.full_name IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) as assignee_names
FROM public.subtasks s
LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
LEFT JOIN public.team_member tm ON sa.user_id = tm.id
GROUP BY s.id, s.task_id, s.title, s.description, s.completed, s.order_index,
         s.estimated_hours, s.actual_hours, s.completed_at, s.created_at, s.updated_at, s.assigned_to;

-- Step 7: Create helper functions for subtask assignments
CREATE OR REPLACE FUNCTION public.assign_users_to_subtask(
  p_subtask_id UUID,
  p_user_ids UUID[],
  p_assigned_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Clear existing assignments for this subtask
  DELETE FROM public.subtask_assignments WHERE subtask_id = p_subtask_id;
  
  -- Add new assignments
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.subtask_assignments (subtask_id, user_id, assigned_by)
    VALUES (p_subtask_id, user_id, COALESCE(p_assigned_by, auth.uid()));
  END LOOP;
END;
$$;

-- Step 8: Create function to get subtask assignees
CREATE OR REPLACE FUNCTION public.get_subtask_assignees(p_subtask_id UUID)
RETURNS TABLE(
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  assigned_at TIMESTAMP WITH TIME ZONE,
  role VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.user_id,
    tm.email,
    tm.full_name,
    sa.assigned_at,
    sa.role
  FROM public.subtask_assignments sa
  JOIN public.team_member tm ON sa.user_id = tm.id
  WHERE sa.subtask_id = p_subtask_id
  ORDER BY sa.assigned_at;
END;
$$;

-- Step 9: Create function to get effective assignees (including inheritance)
CREATE OR REPLACE FUNCTION public.get_effective_subtask_assignees(p_subtask_id UUID)
RETURNS TABLE(
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  assigned_at TIMESTAMP WITH TIME ZONE,
  role VARCHAR,
  assignment_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_id UUID;
  has_explicit_assignments BOOLEAN;
BEGIN
  -- Get the task_id for this subtask
  SELECT s.task_id INTO task_id
  FROM public.subtasks s
  WHERE s.id = p_subtask_id;
  
  -- Check if subtask has explicit assignments
  SELECT EXISTS(
    SELECT 1 FROM public.subtask_assignments 
    WHERE subtask_id = p_subtask_id
  ) INTO has_explicit_assignments;
  
  -- If subtask has explicit assignments, return those
  IF has_explicit_assignments THEN
    RETURN QUERY
    SELECT 
      sa.user_id,
      tm.email,
      tm.full_name,
      sa.assigned_at,
      sa.role,
      'explicit'::VARCHAR as assignment_type
    FROM public.subtask_assignments sa
    JOIN public.team_member tm ON sa.user_id = tm.id
    WHERE sa.subtask_id = p_subtask_id
    ORDER BY sa.assigned_at;
  ELSE
    -- Otherwise, inherit from parent task
    RETURN QUERY
    SELECT 
      ta.user_id,
      tm.email,
      tm.full_name,
      ta.assigned_at,
      ta.role,
      'inherited'::VARCHAR as assignment_type
    FROM public.task_assignments ta
    JOIN public.team_member tm ON ta.user_id = tm.id
    WHERE ta.task_id = task_id
    ORDER BY ta.assigned_at;
  END IF;
END;
$$;

-- Step 10: Create function to bulk assign subtasks to users
CREATE OR REPLACE FUNCTION public.bulk_assign_subtasks_to_user(
  p_subtask_ids UUID[],
  p_user_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subtask_id UUID;
BEGIN
  FOREACH subtask_id IN ARRAY p_subtask_ids
  LOOP
    -- Insert assignment, ignoring conflicts
    INSERT INTO public.subtask_assignments (subtask_id, user_id, assigned_by)
    VALUES (subtask_id, p_user_id, COALESCE(p_assigned_by, auth.uid()))
    ON CONFLICT (subtask_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Step 11: Create trigger to maintain data consistency
CREATE OR REPLACE FUNCTION public.ensure_subtask_has_assignees()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If we're deleting the last assignment, prevent it
  IF TG_OP = 'DELETE' THEN
    IF (SELECT COUNT(*) FROM public.subtask_assignments WHERE subtask_id = OLD.subtask_id) <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last assignee from a subtask';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_ensure_subtask_has_assignees
  BEFORE DELETE ON public.subtask_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_subtask_has_assignees();

-- Step 12: Create function to sync subtask assignments with task assignments
CREATE OR REPLACE FUNCTION public.sync_subtask_assignments_with_task(
  p_task_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  subtask_record RECORD;
BEGIN
  -- For each subtask without explicit assignments, sync with task assignments
  FOR subtask_record IN 
    SELECT s.id 
    FROM public.subtasks s
    LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
    WHERE s.task_id = p_task_id 
    AND sa.subtask_id IS NULL
  LOOP
    -- Copy task assignments to subtask
    INSERT INTO public.subtask_assignments (subtask_id, user_id, assigned_by, role)
    SELECT 
      subtask_record.id,
      ta.user_id,
      ta.assigned_by,
      ta.role
    FROM public.task_assignments ta
    WHERE ta.task_id = p_task_id
    ON CONFLICT (subtask_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Step 13: Create trigger to automatically sync subtask assignments when task assignments change
CREATE OR REPLACE FUNCTION public.auto_sync_subtask_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync subtask assignments when task assignments change
  PERFORM public.sync_subtask_assignments_with_task(NEW.task_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_sync_subtask_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_sync_subtask_assignments();

-- Step 14: Add comments for documentation
COMMENT ON TABLE public.subtask_assignments IS 'Junction table for many-to-many relationship between subtasks and team members (assignees)';
COMMENT ON TABLE public.subtasks_with_assignees IS 'View providing subtasks with their assignee information in an easily queryable format';
COMMENT ON FUNCTION public.assign_users_to_subtask IS 'Function to assign multiple users to a subtask, replacing existing assignments';
COMMENT ON FUNCTION public.get_subtask_assignees IS 'Function to retrieve all explicit assignees for a specific subtask';
COMMENT ON FUNCTION public.get_effective_subtask_assignees IS 'Function to retrieve effective assignees for a subtask (explicit + inherited)';
COMMENT ON FUNCTION public.bulk_assign_subtasks_to_user IS 'Function to assign multiple subtasks to a single user';
COMMENT ON FUNCTION public.sync_subtask_assignments_with_task IS 'Function to sync subtask assignments with parent task assignments';

-- Step 15: Update existing subtasks to have proper assignment structure
-- This ensures all existing subtasks are properly set up
UPDATE public.subtasks 
SET assigned_to = (
  SELECT ta.user_id 
  FROM public.task_assignments ta 
  JOIN public.tasks t ON ta.task_id = t.id 
  WHERE t.id = subtasks.task_id 
  LIMIT 1
)
WHERE assigned_to IS NULL 
AND EXISTS (
  SELECT 1 FROM public.task_assignments ta 
  JOIN public.tasks t ON ta.task_id = t.id 
  WHERE t.id = subtasks.task_id
); 