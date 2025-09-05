-- Migration: 045_fix_permission_function.sql
-- Fix the missing check_user_permission function

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.check_user_permission(UUID, VARCHAR, VARCHAR);

-- Create the correct permission check function
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
  
  -- If user not found, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has permission
  RETURN EXISTS (
    SELECT 1 FROM public.permissions 
    WHERE role = user_role 
    AND resource = resource_name 
    AND action = action_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID, VARCHAR, VARCHAR) TO authenticated;
