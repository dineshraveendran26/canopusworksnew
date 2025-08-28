-- Migration: Cleanup old assignment fields and ensure consistency
-- This migration removes the old single-assignee fields and ensures
-- all assignments go through the new many-to-many system

-- Step 1: Remove the old assigned_to field from tasks table
-- This field is no longer needed since we use task_assignments table
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assigned_to;

-- Step 2: Remove the old assigned_to field from subtasks table
-- This field is no longer needed since we use subtask_assignments table
ALTER TABLE public.subtasks DROP COLUMN IF EXISTS assigned_to;

-- Step 3: Update the tasks_with_assignees view to remove references to old fields
DROP VIEW IF EXISTS public.tasks_with_assignees;
CREATE OR REPLACE VIEW public.tasks_with_assignees AS
SELECT 
  t.*,
  COALESCE(
    ARRAY_AGG(ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL),
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
FROM public.tasks t
LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
LEFT JOIN public.team_member tm ON ta.user_id = tm.id
GROUP BY t.id, t.title, t.description, t.priority, t.status, t.start_date, t.due_date,
         t.estimated_hours, t.actual_hours, t.created_by, t.department, t.machine_id,
         t.batch_id, t.quality_score, t.created_at, t.updated_at, t.completed_at, t.user_role;

-- Step 4: Update the subtasks_with_assignees view to remove references to old fields
DROP VIEW IF EXISTS public.subtasks_with_assignees;
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
         s.estimated_hours, s.actual_hours, s.completed_at, s.created_at, s.updated_at;

-- Step 5: Create a comprehensive view for tasks with all related data
CREATE OR REPLACE VIEW public.tasks_with_full_details AS
SELECT 
  t.*,
  -- Task assignees
  COALESCE(
    ARRAY_AGG(DISTINCT ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL),
    ARRAY[]::UUID[]
  ) as task_assignee_ids,
  COALESCE(
    ARRAY_AGG(DISTINCT tm.email) FILTER (WHERE tm.email IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) as task_assignee_emails,
  COALESCE(
    ARRAY_AGG(DISTINCT tm.full_name) FILTER (WHERE tm.email IS NOT NULL),
    ARRAY[]::VARCHAR[]
  ) as task_assignee_names,
  -- Subtasks with their assignees
  COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', s.id,
        'title', s.title,
        'description', s.description,
        'completed', s.completed,
        'order_index', s.order_index,
        'estimated_hours', s.estimated_hours,
        'actual_hours', s.actual_hours,
        'completed_at', s.completed_at,
        'assignee_ids', COALESCE(
          ARRAY_AGG(DISTINCT sa.user_id) FILTER (WHERE sa.user_id IS NOT NULL),
          ARRAY[]::UUID[]
        ),
        'assignee_emails', COALESCE(
          ARRAY_AGG(DISTINCT stm.email) FILTER (WHERE stm.email IS NOT NULL),
          ARRAY[]::VARCHAR[]
        ),
        'assignee_names', COALESCE(
          ARRAY_AGG(DISTINCT stm.full_name) FILTER (WHERE stm.full_name IS NOT NULL),
          ARRAY[]::VARCHAR[]
        )
      ) ORDER BY s.order_index
    ) FILTER (WHERE s.id IS NOT NULL),
    '[]'::JSON
  ) as subtasks_with_assignees
FROM public.tasks t
LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
LEFT JOIN public.team_member tm ON ta.user_id = tm.id
LEFT JOIN public.subtasks s ON t.id = s.task_id
LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
LEFT JOIN public.team_member stm ON sa.user_id = stm.id
GROUP BY t.id, t.title, t.description, t.priority, t.status, t.start_date, t.due_date,
         t.estimated_hours, t.actual_hours, t.created_by, t.department, t.machine_id,
         t.batch_id, t.quality_score, t.created_at, t.updated_at, t.completed_at, t.user_role;

-- Step 6: Create a function to get all assignments for a task (including subtasks)
CREATE OR REPLACE FUNCTION public.get_task_with_all_assignments(p_task_id UUID)
RETURNS TABLE(
  task_id UUID,
  task_title VARCHAR,
  task_assignee_ids UUID[],
  task_assignee_names VARCHAR[],
  subtask_id UUID,
  subtask_title VARCHAR,
  subtask_assignee_ids UUID[],
  subtask_assignee_names VARCHAR[],
  assignment_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH task_assignments AS (
    SELECT 
      t.id as task_id,
      t.title as task_title,
      ARRAY_AGG(ta.user_id) as assignee_ids,
      ARRAY_AGG(tm.full_name) as assignee_names
    FROM public.tasks t
    LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
    LEFT JOIN public.team_member tm ON ta.user_id = tm.id
    WHERE t.id = p_task_id
    GROUP BY t.id, t.title
  ),
  subtask_assignments AS (
    SELECT 
      s.id as subtask_id,
      s.title as subtask_title,
      s.task_id,
      COALESCE(
        ARRAY_AGG(sa.user_id) FILTER (WHERE sa.user_id IS NOT NULL),
        ARRAY[]::UUID[]
      ) as explicit_assignee_ids,
      COALESCE(
        ARRAY_AGG(stm.full_name) FILTER (WHERE stm.full_name IS NOT NULL),
        ARRAY[]::VARCHAR[]
      ) as explicit_assignee_names
    FROM public.subtasks s
    LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
    LEFT JOIN public.team_member stm ON sa.user_id = stm.id
    WHERE s.task_id = p_task_id
    GROUP BY s.id, s.title, s.task_id
  )
  SELECT 
    ta.task_id,
    ta.task_title,
    ta.assignee_ids,
    ta.assignee_names,
    sa.subtask_id,
    sa.subtask_title,
    CASE 
      WHEN sa.explicit_assignee_ids = ARRAY[]::UUID[] THEN ta.assignee_ids
      ELSE sa.explicit_assignee_ids
    END as subtask_assignee_ids,
    CASE 
      WHEN sa.explicit_assignee_names = ARRAY[]::VARCHAR[] THEN ta.assignee_names
      ELSE sa.explicit_assignee_names
    END as subtask_assignee_names,
    CASE 
      WHEN sa.explicit_assignee_ids = ARRAY[]::UUID[] THEN 'inherited'
      ELSE 'explicit'
    END as assignment_type
  FROM task_assignments ta
  LEFT JOIN subtask_assignments sa ON ta.task_id = sa.task_id
  ORDER BY sa.subtask_id NULLS FIRST, sa.subtask_title;
END;
$$;

-- Step 7: Create a function to validate assignment consistency
CREATE OR REPLACE FUNCTION public.validate_assignment_consistency()
RETURNS TABLE(
  issue_type VARCHAR,
  task_id UUID,
  subtask_id UUID,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check for tasks with no assignees
  RETURN QUERY
  SELECT 
    'task_no_assignees'::VARCHAR as issue_type,
    t.id as task_id,
    NULL::UUID as subtask_id,
    'Task has no assignees'::TEXT as description
  FROM public.tasks t
  LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
  WHERE ta.task_id IS NULL;
  
  -- Check for subtasks with no assignees and parent task with no assignees
  RETURN QUERY
  SELECT 
    'subtask_no_assignees_no_inheritance'::VARCHAR as issue_type,
    s.task_id as task_id,
    s.id as subtask_id,
    'Subtask has no assignees and cannot inherit from parent task'::TEXT as description
  FROM public.subtasks s
  LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
  LEFT JOIN public.task_assignments ta ON s.task_id = ta.task_id
  WHERE sa.subtask_id IS NULL AND ta.task_id IS NULL;
  
  -- Check for orphaned assignments
  RETURN QUERY
  SELECT 
    'orphaned_task_assignment'::VARCHAR as issue_type,
    ta.task_id as task_id,
    NULL::UUID as subtask_id,
    'Task assignment references non-existent task'::TEXT as description
  FROM public.task_assignments ta
  LEFT JOIN public.tasks t ON ta.task_id = t.id
  WHERE t.id IS NULL;
  
  RETURN QUERY
  SELECT 
    'orphaned_subtask_assignment'::VARCHAR as issue_type,
    NULL::UUID as task_id,
    sa.subtask_id as subtask_id,
    'Subtask assignment references non-existent subtask'::TEXT as description
  FROM public.subtask_assignments sa
  LEFT JOIN public.subtasks s ON sa.subtask_id = s.id
  WHERE s.id IS NULL;
END;
$$;

-- Step 8: Create a function to fix assignment inconsistencies
CREATE OR REPLACE FUNCTION public.fix_assignment_inconsistencies()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fixed_count INTEGER := 0;
  task_record RECORD;
BEGIN
  -- Fix subtasks without assignees by inheriting from parent task
  FOR task_record IN 
    SELECT DISTINCT s.task_id
    FROM public.subtasks s
    LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
    LEFT JOIN public.task_assignments ta ON s.task_id = ta.task_id
    WHERE sa.subtask_id IS NULL AND ta.task_id IS NOT NULL
  LOOP
    PERFORM public.sync_subtask_assignments_with_task(task_record.task_id);
    fixed_count := fixed_count + 1;
  END LOOP;
  
  -- Remove orphaned assignments
  DELETE FROM public.task_assignments 
  WHERE task_id NOT IN (SELECT id FROM public.tasks);
  
  DELETE FROM public.subtask_assignments 
  WHERE subtask_id NOT IN (SELECT id FROM public.subtasks);
  
  RETURN fixed_count;
END;
$$;

-- Step 9: Add comments for documentation
COMMENT ON VIEW public.tasks_with_full_details IS 'Comprehensive view providing tasks with all subtasks and their assignee information';
COMMENT ON FUNCTION public.get_task_with_all_assignments IS 'Function to retrieve a task with all its subtasks and their effective assignments';
COMMENT ON FUNCTION public.validate_assignment_consistency IS 'Function to identify assignment inconsistencies in the system';
COMMENT ON FUNCTION public.fix_assignment_inconsistencies IS 'Function to automatically fix common assignment inconsistencies';

-- Step 10: Create a summary view for dashboard/reporting
CREATE OR REPLACE VIEW public.assignment_summary AS
SELECT 
  t.id as task_id,
  t.title as task_title,
  t.status as task_status,
  t.priority as task_priority,
  COUNT(DISTINCT ta.user_id) as task_assignee_count,
  COUNT(DISTINCT s.id) as subtask_count,
  COUNT(DISTINCT CASE WHEN s.completed THEN s.id END) as completed_subtask_count,
  COUNT(DISTINCT sa.user_id) as subtask_assignee_count,
  CASE 
    WHEN COUNT(DISTINCT s.id) = 0 THEN 'No subtasks'
    WHEN COUNT(DISTINCT s.id) = COUNT(DISTINCT CASE WHEN s.completed THEN s.id END) THEN 'All subtasks completed'
    ELSE 'In progress'
  END as subtask_status
FROM public.tasks t
LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
LEFT JOIN public.subtasks s ON t.id = s.task_id
LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
GROUP BY t.id, t.title, t.status, t.priority
ORDER BY t.created_at DESC;

COMMENT ON VIEW public.assignment_summary IS 'Summary view for dashboard showing task and subtask assignment counts and status'; 