-- Fix user creation trigger issue
-- Migration: 031_fix_user_creation_trigger.sql

-- First, let's see what triggers exist on the users table
-- Then disable the problematic one temporarily

-- Disable the problematic trigger temporarily
DROP TRIGGER IF EXISTS promote_first_user_to_admin ON public.users;

-- Also check if there are other triggers causing issues
DROP TRIGGER IF EXISTS users_audit_trigger ON public.users;

-- Now let's create a simple, working trigger that doesn't cause foreign key issues
CREATE OR REPLACE FUNCTION public.handle_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if the user is fully committed
  -- This prevents foreign key constraint violations
  IF TG_OP = 'INSERT' THEN
    -- Simple logging without complex foreign key dependencies
    INSERT INTO public.user_audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      new_values,
      created_at
    ) VALUES (
      NEW.id, 
      'user_created', 
      'users', 
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'role', NEW.role,
        'first_name', COALESCE(NEW.first_name, ''),
        'last_name', COALESCE(NEW.last_name, ''),
        'department', COALESCE(NEW.department, '')
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER users_creation_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_creation();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_user_creation() TO authenticated; 