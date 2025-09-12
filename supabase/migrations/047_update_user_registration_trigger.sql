-- Migration: 047_update_user_registration_trigger.sql
-- Update the user registration trigger to use enhanced notification functions

-- Update the handle_new_user function to use detailed notifications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name VARCHAR(255);
  v_last_name VARCHAR(255);
  v_full_name VARCHAR(255);
  v_department VARCHAR(255);
  v_title VARCHAR(255);
  v_phone VARCHAR(255);
BEGIN
  -- Extract user details from metadata
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 
                          CASE 
                            WHEN v_first_name != '' AND v_last_name != '' 
                            THEN v_first_name || ' ' || v_last_name
                            ELSE NEW.email
                          END);
  v_department := COALESCE(NEW.raw_user_meta_data->>'department', 'General');
  v_title := COALESCE(NEW.raw_user_meta_data->>'title', 'Employee');
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);
  
  -- Insert user profile with is_active = FALSE for approval workflow
  INSERT INTO public.users (
    id, email, first_name, last_name, full_name, role, department, title, phone, is_active
  ) VALUES (
    NEW.id, NEW.email, v_first_name, v_last_name, v_full_name, 
    'viewer', v_department, v_title, v_phone, FALSE
  );
  
  -- Create detailed approval notification for administrators
  PERFORM public.create_detailed_approval_notification(
    NEW.id, NEW.email, v_full_name, v_department, v_title
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the trigger
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
