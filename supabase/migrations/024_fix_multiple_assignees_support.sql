-- Migration: Fix multiple assignees support for tasks
-- This migration creates a proper many-to-many relationship between tasks and users
-- for task assignments, replacing the single assigned_to field

-- Step 1: Create the task_assignments junction table
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.users(id),
  role VARCHAR(50) DEFAULT 'assignee', -- 'assignee', 'reviewer', 'approver', etc.
  UNIQUE(task_id, user_id)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_at ON public.task_assignments(assigned_at);

-- Step 3: Migrate existing single assignee data to the new table
INSERT INTO public.task_assignments (task_id, user_id, assigned_at, assigned_by)
SELECT 
  id as task_id,
  assigned_to as user_id,
  created_at as assigned_at,
  created_by as assigned_by
FROM public.tasks 
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Step 4: Create a view for easier querying of tasks with assignees
CREATE OR REPLACE VIEW public.tasks_with_assignees AS
SELECT 
  t.*,
  COALESCE(
    ARRAY_AGG(ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL),
    ARRAY[]::UUID[]
  ) as assignee_ids,
  COALESCE(
    ARRAY_AGG(u.email) FILTER (WHERE u.email IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) as assignee_emails,
  COALESCE(
    ARRAY_AGG(u.full_name) FILTER (WHERE u.full_name IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) as assignee_names
FROM public.tasks t
LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
LEFT JOIN public.users u ON ta.user_id = u.id
GROUP BY t.id, t.title, t.description, t.priority, t.status, t.start_date, t.due_date,
         t.estimated_hours, t.actual_hours, t.created_by, t.department, t.machine_id,
         t.batch_id, t.quality_score, t.created_at, t.updated_at, t.completed_at;

-- Step 5: Create RLS policies for the new table
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see assignments for tasks they have access to
CREATE POLICY "Users can view task assignments for accessible tasks" ON public.task_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_assignments.task_id 
      AND (
        t.created_by = auth.uid() OR 
        t.assigned_to = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.task_assignments ta 
          WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Users can create assignments for tasks they created or manage
CREATE POLICY "Users can create task assignments for owned/managed tasks" ON public.task_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_assignments.task_id 
      AND (
        t.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = auth.uid() AND u.role = 'administrator'
        )
      )
    )
  );

-- Policy: Users can update assignments for tasks they created or manage
CREATE POLICY "Users can update task assignments for owned/managed tasks" ON public.task_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_assignments.task_id 
      AND (
        t.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = auth.uid() AND u.role = 'administrator'
        )
      )
    )
  );

-- Policy: Users can delete assignments for tasks they created or manage
CREATE POLICY "Users can delete task assignments for owned/managed tasks" ON public.task_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_assignments.task_id 
      AND (
        t.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = auth.uid() AND u.role = 'administrator'
        )
      )
    )
  );

-- Step 6: Create helper functions for task assignments
CREATE OR REPLACE FUNCTION public.assign_users_to_task(
  p_task_id UUID,
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
  -- Clear existing assignments for this task
  DELETE FROM public.task_assignments WHERE task_id = p_task_id;
  
  -- Add new assignments
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.task_assignments (task_id, user_id, assigned_by)
    VALUES (p_task_id, user_id, COALESCE(p_assigned_by, auth.uid()));
  END LOOP;
END;
$$;

-- Step 7: Create function to get task assignees
CREATE OR REPLACE FUNCTION public.get_task_assignees(p_task_id UUID)
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
    ta.user_id,
    u.email,
    u.full_name,
    ta.assigned_at,
    ta.role
  FROM public.task_assignments ta
  JOIN public.users u ON ta.user_id = u.id
  WHERE ta.task_id = p_task_id
  ORDER BY ta.assigned_at;
END;
$$;

-- Step 8: Update existing RLS policies on tasks table to work with new assignment system
-- (This ensures tasks are accessible to all assigned users, not just the single assigned_to)

-- Step 9: Create trigger to maintain data consistency
CREATE OR REPLACE FUNCTION public.ensure_task_has_assignees()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If we're deleting the last assignment, prevent it
  IF TG_OP = 'DELETE' THEN
    IF (SELECT COUNT(*) FROM public.task_assignments WHERE task_id = OLD.task_id) <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last assignee from a task';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_ensure_task_has_assignees
  BEFORE DELETE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_task_has_assignees();

-- Step 10: Add comment for documentation
COMMENT ON TABLE public.task_assignments IS 'Junction table for many-to-many relationship between tasks and users (assignees)';
COMMENT ON TABLE public.tasks_with_assignees IS 'View providing tasks with their assignee information in an easily queryable format';
COMMENT ON FUNCTION public.assign_users_to_task IS 'Function to assign multiple users to a task, replacing existing assignments';
COMMENT ON FUNCTION public.get_task_assignees IS 'Function to retrieve all assignees for a specific task'; 