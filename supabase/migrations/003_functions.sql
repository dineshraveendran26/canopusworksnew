-- Database Functions for Canopus Works
-- Migration: 003_functions.sql

-- Function to create a new user and send invitation
CREATE OR REPLACE FUNCTION public.create_user_with_invitation(
  p_first_name VARCHAR(255),
  p_last_name VARCHAR(255),
  p_title VARCHAR(255),
  p_email VARCHAR(255),
  p_phone VARCHAR(20),
  p_role user_role,
  p_department VARCHAR(100),
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_invitation_token TEXT;
BEGIN
  -- Insert new user
  INSERT INTO public.users (
    first_name, last_name, title, email, phone, role, department, created_by
  ) VALUES (
    p_first_name, p_last_name, p_title, p_email, p_phone, p_role, p_department, p_created_by
  ) RETURNING id INTO v_user_id;

  -- Generate invitation token (this will be handled by Supabase Auth)
  -- For now, we'll just log the user creation
  
  -- Log the action
  INSERT INTO public.user_audit_log (
    user_id, action, table_name, record_id, new_values
  ) VALUES (
    p_created_by, 'user_created', 'users', v_user_id,
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'first_name', p_first_name,
      'last_name', p_last_name
    )
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user role
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id UUID,
  p_new_role user_role,
  p_updated_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_role user_role;
BEGIN
  -- Get current role
  SELECT role INTO v_old_role FROM public.users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update role
  UPDATE public.users SET role = p_new_role WHERE id = p_user_id;

  -- Log the action
  INSERT INTO public.user_audit_log (
    user_id, action, table_name, record_id, old_values, new_values
  ) VALUES (
    p_updated_by, 'role_updated', 'users', p_user_id,
    jsonb_build_object('role', v_old_role),
    jsonb_build_object('role', p_new_role)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate user
CREATE OR REPLACE FUNCTION public.deactivate_user(
  p_user_id UUID,
  p_deactivated_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Deactivate user
  UPDATE public.users SET is_active = FALSE WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Log the action
  INSERT INTO public.user_audit_log (
    user_id, action, table_name, record_id, new_values
  ) VALUES (
    p_deactivated_by, 'user_deactivated', 'users', p_user_id,
    jsonb_build_object('is_active', FALSE)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(
  can_create_users BOOLEAN,
  can_manage_users BOOLEAN,
  can_create_tasks BOOLEAN,
  can_edit_tasks BOOLEAN,
  can_delete_tasks BOOLEAN,
  can_manage_team_members BOOLEAN,
  can_view_audit_logs BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.role = 'administrator' AS can_create_users,
    u.role = 'administrator' AS can_manage_users,
    u.role IN ('administrator', 'manager') AS can_create_tasks,
    u.role IN ('administrator', 'manager') AS can_edit_tasks,
    u.role IN ('administrator', 'manager') AS can_delete_tasks,
    u.role IN ('administrator', 'manager') AS can_manage_team_members,
    u.role = 'administrator' AS can_view_audit_logs
  FROM public.users u
  WHERE u.id = p_user_id AND u.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to audit task changes
CREATE OR REPLACE FUNCTION public.audit_task_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_audit_log (
      user_id, action, table_name, record_id, new_values
    ) VALUES (
      NEW.created_by, 'task_created', TG_TABLE_NAME, NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.user_audit_log (
      user_id, action, table_name, record_id, old_values, new_values
    ) VALUES (
      COALESCE(NEW.updated_by, NEW.created_by), 'task_updated', TG_TABLE_NAME, NEW.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.user_audit_log (
      user_id, action, table_name, record_id, old_values
    ) VALUES (
      OLD.created_by, 'task_deleted', TG_TABLE_NAME, OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to audit comment changes
CREATE OR REPLACE FUNCTION public.audit_comment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_audit_log (
      user_id, action, table_name, record_id, new_values
    ) VALUES (
      NEW.author_id, 'comment_created', TG_TABLE_NAME, NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.user_audit_log (
      user_id, action, table_name, record_id, old_values, new_values
    ) VALUES (
      COALESCE(NEW.edited_by, NEW.author_id), 'comment_updated', TG_TABLE_NAME, NEW.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.user_audit_log (
      user_id, action, table_name, record_id, old_values
    ) VALUES (
      OLD.author_id, 'comment_deleted', TG_TABLE_NAME, OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
CREATE TRIGGER audit_task_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_task_change();

CREATE TRIGGER audit_subtask_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_task_change();

CREATE TRIGGER audit_comment_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.audit_comment_change();

-- Function to get task statistics for dashboard
CREATE OR REPLACE FUNCTION public.get_task_statistics(p_user_id UUID)
RETURNS TABLE(
  total_tasks BIGINT,
  todo_tasks BIGINT,
  in_progress_tasks BIGINT,
  completed_tasks BIGINT,
  overdue_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'Todo') AS todo_tasks,
    COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'Completed') AS completed_tasks,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'Completed') AS overdue_tasks
  FROM public.tasks
  WHERE created_by = p_user_id OR 
        EXISTS (
          SELECT 1 FROM public.task_assignments ta
          JOIN public.team_members tm ON ta.team_member_id = tm.id
          WHERE ta.task_id = tasks.id AND tm.email = (
            SELECT email FROM public.users WHERE id = p_user_id
          )
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 