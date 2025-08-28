-- Date Logic and Validation for Canopus Works
-- Migration: 005_date_logic_and_validation.sql

-- Add date validation constraints
ALTER TABLE public.tasks 
ADD CONSTRAINT check_task_dates 
CHECK (
  (start_date IS NULL AND due_date IS NULL) OR
  (start_date IS NOT NULL AND due_date IS NULL) OR
  (start_date IS NULL AND due_date IS NOT NULL) OR
  (start_date <= due_date)
);

ALTER TABLE public.subtasks 
ADD CONSTRAINT check_subtask_dates 
CHECK (
  (start_date IS NULL AND end_date IS NULL) OR
  (start_date IS NOT NULL AND end_date IS NULL) OR
  (start_date IS NULL AND end_date IS NOT NULL) OR
  (start_date <= end_date)
);

-- Function to automatically update task status based on dates
CREATE OR REPLACE FUNCTION public.update_task_status_by_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if dates are being updated
  IF TG_OP = 'UPDATE' AND (OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
    
    -- If task is marked as completed, don't change status
    IF NEW.status = 'Completed' THEN
      RETURN NEW;
    END IF;
    
    -- Auto-update status based on dates
    IF NEW.start_date IS NOT NULL AND NEW.start_date <= CURRENT_DATE THEN
      -- If start date is today or past, and status is still Todo, change to In Progress
      IF NEW.status = 'Todo' THEN
        NEW.status = 'In Progress';
      END IF;
    END IF;
    
    -- Check if task is overdue
    IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.status != 'Completed' THEN
      -- Task is overdue - you could add an 'overdue' field or handle this in the UI
      -- For now, we'll just log it in the audit log
      INSERT INTO public.user_audit_log (
        user_id, action, table_name, record_id, new_values
      ) VALUES (
        COALESCE(NEW.updated_by, NEW.created_by), 'task_overdue', TG_TABLE_NAME, NEW.id,
        jsonb_build_object('due_date', NEW.due_date, 'current_date', CURRENT_DATE)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update subtask status based on dates
CREATE OR REPLACE FUNCTION public.update_subtask_status_by_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if dates are being updated
  IF TG_OP = 'UPDATE' AND (OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date) THEN
    
    -- If subtask is marked as completed, don't change status
    IF NEW.completed = TRUE THEN
      RETURN NEW;
    END IF;
    
    -- Check if subtask is overdue
    IF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE AND NEW.completed = FALSE THEN
      -- Subtask is overdue - log it
      INSERT INTO public.user_audit_log (
        user_id, action, table_name, record_id, new_values
      ) VALUES (
        (SELECT created_by FROM public.tasks WHERE id = NEW.task_id), 'subtask_overdue', TG_TABLE_NAME, NEW.id,
        jsonb_build_object('end_date', NEW.end_date, 'current_date', CURRENT_DATE)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic date-based status updates
CREATE TRIGGER trigger_update_task_status_by_dates
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_task_status_by_dates();

CREATE TRIGGER trigger_update_subtask_status_by_dates
  AFTER UPDATE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.update_subtask_status_by_dates();

-- Function to get overdue tasks for a user
CREATE OR REPLACE FUNCTION public.get_overdue_tasks(p_user_id UUID)
RETURNS TABLE(
  task_id UUID,
  title VARCHAR(255),
  due_date DATE,
  days_overdue INTEGER,
  priority task_priority,
  department VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.due_date,
    (CURRENT_DATE - t.due_date)::INTEGER AS days_overdue,
    t.priority,
    t.department
  FROM public.tasks t
  WHERE t.due_date < CURRENT_DATE 
    AND t.status != 'Completed'
    AND (t.created_by = p_user_id OR 
         EXISTS (
           SELECT 1 FROM public.task_assignments ta
           JOIN public.team_members tm ON ta.team_member_id = tm.id
           WHERE ta.task_id = t.id AND tm.email = (
             SELECT email FROM public.users WHERE id = p_user_id
           )
         ))
  ORDER BY t.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get upcoming tasks (due in next 7 days)
CREATE OR REPLACE FUNCTION public.get_upcoming_tasks(p_user_id UUID, p_days_ahead INTEGER DEFAULT 7)
RETURNS TABLE(
  task_id UUID,
  title VARCHAR(255),
  due_date DATE,
  days_until_due INTEGER,
  priority task_priority,
  status task_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.due_date,
    (t.due_date - CURRENT_DATE)::INTEGER AS days_until_due,
    t.priority,
    t.status
  FROM public.tasks t
  WHERE t.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
    AND t.status != 'Completed'
    AND (t.created_by = p_user_id OR 
         EXISTS (
           SELECT 1 FROM public.task_assignments ta
           JOIN public.team_members tm ON ta.team_member_id = tm.id
           WHERE ta.task_id = t.id AND tm.email = (
             SELECT email FROM public.users WHERE id = p_user_id
           )
         ))
  ORDER BY t.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tasks by date range
CREATE OR REPLACE FUNCTION public.get_tasks_by_date_range(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  task_id UUID,
  title VARCHAR(255),
  start_date DATE,
  due_date DATE,
  status task_status,
  priority task_priority,
  department VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.start_date,
    t.due_date,
    t.status,
    t.priority,
    t.department
  FROM public.tasks t
  WHERE (t.start_date BETWEEN p_start_date AND p_end_date)
     OR (t.due_date BETWEEN p_start_date AND p_end_date)
     OR (t.start_date <= p_start_date AND t.due_date >= p_end_date)
    AND (t.created_by = p_user_id OR 
         EXISTS (
           SELECT 1 FROM public.task_assignments ta
           JOIN public.team_members tm ON ta.team_member_id = tm.id
           WHERE ta.task_id = t.id AND tm.email = (
             SELECT email FROM public.users WHERE id = p_user_id
           )
         ))
  ORDER BY t.start_date ASC, t.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_overdue_tasks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_upcoming_tasks(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tasks_by_date_range(UUID, DATE, DATE) TO authenticated;

-- Add indexes for date-based queries
CREATE INDEX idx_tasks_start_date ON public.tasks(start_date);
CREATE INDEX idx_tasks_due_date_status ON public.tasks(due_date, status);
CREATE INDEX idx_subtasks_start_date ON public.subtasks(start_date);
CREATE INDEX idx_subtasks_end_date ON public.subtasks(end_date);
CREATE INDEX idx_subtasks_end_date_completed ON public.subtasks(end_date, completed); 