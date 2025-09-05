-- Fix user registration trigger to work with enhanced approval system
-- Migration: 044_fix_user_registration_trigger.sql

-- Update the handle_new_user function to properly create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name VARCHAR(255);
  v_initials VARCHAR(10);
  v_title VARCHAR(255);
  v_department VARCHAR(100);
  v_phone VARCHAR(20);
BEGIN
  -- Extract user details from metadata
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  IF TRIM(v_full_name) = '' THEN 
    v_full_name := split_part(NEW.email, '@', 1); 
  END IF;
  
  v_initials := UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)), 1)) ||
                UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'last_name', ''), 1));
  IF TRIM(v_initials) = '' THEN 
    v_initials := UPPER(LEFT(split_part(NEW.email, '@', 1), 1)); 
  END IF;
  
  v_title := COALESCE(NEW.raw_user_meta_data->>'title', 'Employee');
  v_department := COALESCE(NEW.raw_user_meta_data->>'department', 'General');
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);

  -- Insert user profile with is_active = FALSE for approval workflow
  INSERT INTO public.users (
    id, email, full_name, initials, role, department, 
    phone, join_date, status, is_active, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.email, v_full_name, v_initials, 'viewer', v_department,
    v_phone, CURRENT_DATE, 'active', FALSE, NOW(), NOW()
  );

  -- Create approval notification for administrators
  PERFORM public.create_user_approval_notification(
    NEW.id, NEW.email, v_full_name, v_department, v_title
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
