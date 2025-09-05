-- Workaround for the email_verified constraint issue
-- Create a new function that handles the constraint properly

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
  v_full_name VARCHAR(255);
  v_initials VARCHAR(10);
  v_created_by_exists BOOLEAN;
  v_email_verified BOOLEAN;
  v_existing_user_count INTEGER;
BEGIN
  -- Check if the created_by user exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_created_by) INTO v_created_by_exists;
  
  -- Generate full_name and initials
  v_full_name := p_first_name || ' ' || p_last_name;
  v_initials := UPPER(LEFT(p_first_name, 1)) || UPPER(LEFT(p_last_name, 1));
  
  -- Count existing users with email_verified = false
  SELECT COUNT(*) INTO v_existing_user_count 
  FROM public.users 
  WHERE email_verified = FALSE;
  
  -- Determine email_verified value based on existing users
  -- If there's already a user with email_verified = false, set new user to true
  IF v_existing_user_count > 0 THEN
    v_email_verified := TRUE;
  ELSE
    v_email_verified := FALSE;
  END IF;
  
  -- Insert new user with all required columns including email_verified
  INSERT INTO public.users (
    email,
    first_name,
    last_name,
    title,
    phone,
    role,
    department,
    full_name,
    initials,
    join_date,
    status,
    is_active,
    email_verified,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name,
    p_title,
    p_phone,
    p_role,
    p_department,
    v_full_name,
    v_initials,
    CURRENT_DATE,
    'active',
    TRUE,
    v_email_verified,
    CASE WHEN v_created_by_exists THEN p_created_by ELSE NULL END,
    NOW(),
    NOW()
  ) RETURNING id INTO v_user_id;

  -- Only log the action if the created_by user exists and audit logging is enabled
  IF v_created_by_exists THEN
    BEGIN
      INSERT INTO public.user_audit_log (
        user_id, action, table_name, record_id, new_values
      ) VALUES (
        p_created_by, 'user_created', 'users', v_user_id,
        jsonb_build_object(
          'email', p_email,
          'role', p_role,
          'first_name', p_first_name,
          'last_name', p_last_name,
          'department', p_department,
          'full_name', v_full_name,
          'email_verified', v_email_verified
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- If audit logging fails, just log a warning and continue
      RAISE WARNING 'Audit logging failed: %', SQLERRM;
    END;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_with_invitation TO authenticated; 