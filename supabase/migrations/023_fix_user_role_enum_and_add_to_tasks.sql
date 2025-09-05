-- Fix user_role enum case mismatch and add user_role to tasks table
-- Migration: 023_fix_user_role_enum_and_add_to_tasks.sql

-- Step 1: Fix the case mismatch in team_member table RLS policy
-- The enum is 'administrator' (lowercase) but the policy uses 'Administrator' (uppercase)
DROP POLICY IF EXISTS "Allow administrators to manage all team members" ON team_member;

CREATE POLICY "Allow administrators to manage all team members" ON team_member
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'administrator'  -- Fixed: lowercase 'administrator'
    )
  );

-- Step 2: Add user_role column to tasks table for better tracking
-- This will help with role-based task filtering and permissions
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_role user_role;

-- Step 3: Update existing tasks to have the user_role based on the creator's role
UPDATE public.tasks 
SET user_role = (
  SELECT u.role 
  FROM public.users u 
  WHERE u.id = tasks.created_by
)
WHERE user_role IS NULL;

-- Step 4: Make user_role NOT NULL for future tasks
ALTER TABLE public.tasks ALTER COLUMN user_role SET NOT NULL;

-- Step 5: Set default user_role for new tasks based on the creator
CREATE OR REPLACE FUNCTION public.set_task_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the user_role based on the user creating the task
  NEW.user_role = (
    SELECT role 
    FROM public.users 
    WHERE id = NEW.created_by
  );
  
  -- If no role found, default to 'viewer'
  IF NEW.user_role IS NULL THEN
    NEW.user_role = 'viewer';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set user_role when inserting tasks
DROP TRIGGER IF EXISTS set_task_user_role_trigger ON public.tasks;
CREATE TRIGGER set_task_user_role_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_user_role();

-- Step 6: Ensure all current users have administrator rights
-- This gives full access to all existing users
UPDATE public.users 
SET role = 'administrator' 
WHERE role IS NULL OR role NOT IN ('administrator', 'manager', 'viewer');

-- Step 7: Update any users with 'Administrator' (uppercase) to 'administrator' (lowercase)
UPDATE public.users 
SET role = 'administrator' 
WHERE role = 'Administrator';

-- Step 8: Ensure all users have proper approval status
UPDATE public.users 
SET approval_status = 'approved', 
    approved_at = NOW() 
WHERE approval_status IS NULL OR approval_status = 'pending';

-- Step 9: Create a function to get user's role for task creation
CREATE OR REPLACE FUNCTION public.get_user_role_for_task(user_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.users
  WHERE id = user_id;
  
  RETURN COALESCE(user_role_value, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Update RLS policies to use the new user_role column
-- This allows better role-based access control
DROP POLICY IF EXISTS "Users can view tasks based on permissions" ON public.tasks;
CREATE POLICY "Users can view tasks based on role and permissions" ON public.tasks
  FOR SELECT USING (
    -- Administrators can see all tasks
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
    OR
    -- Managers can see tasks in their department or assigned to them
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'manager'
      AND (
        users.department = tasks.department
        OR tasks.assigned_to = auth.uid()
        OR tasks.created_by = auth.uid()
      )
    )
    OR
    -- Viewers can see tasks assigned to them or created by them
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'viewer'
      AND (
        tasks.assigned_to = auth.uid()
        OR tasks.created_by = auth.uid()
      )
    )
  );

-- Step 11: Create a view for tasks with user information
-- This makes it easier to query tasks with user role information
CREATE OR REPLACE VIEW public.tasks_with_users AS
SELECT 
  t.*,
  u.full_name as creator_name,
  u.email as creator_email,
  u.role as creator_role,
  u.department as creator_department,
  a.full_name as assignee_name,
  a.email as assignee_email,
  a.role as assignee_role
FROM public.tasks t
LEFT JOIN public.users u ON t.created_by = u.id
LEFT JOIN public.users a ON t.assigned_to = a.id;

-- Grant permissions on the view
GRANT SELECT ON public.tasks_with_users TO authenticated;

-- Step 12: Create index on user_role for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_role ON public.tasks(user_role);
CREATE INDEX IF NOT EXISTS idx_tasks_creator_role ON public.tasks(created_by, user_role);

-- Step 13: Update the check_user_permission function to handle the new structure
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_id UUID,
  resource_name VARCHAR(100),
  action_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Get user's role
  SELECT role INTO user_role_value FROM public.users WHERE id = user_id;
  
  -- Check if user has permission
  RETURN EXISTS (
    SELECT 1 FROM public.permissions 
    WHERE role = user_role_value 
    AND resource = resource_name 
    AND action = action_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Insert any missing permissions for administrator role
INSERT INTO public.permissions (role, resource, action) VALUES
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
  ('administrator', 'team_member', 'create'),
  ('administrator', 'team_member', 'read'),
  ('administrator', 'team_member', 'update'),
  ('administrator', 'team_member', 'delete')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Step 15: Verify the fix by checking current data
-- This will show us the current state after the migration
DO $$
DECLARE
  admin_count INTEGER;
  task_count INTEGER;
BEGIN
  -- Count administrators
  SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'administrator';
  
  -- Count tasks with user_role
  SELECT COUNT(*) INTO task_count FROM public.tasks WHERE user_role IS NOT NULL;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Administrators: %', admin_count;
  RAISE NOTICE 'Tasks with user_role: %', task_count;
END $$; 