-- Fix create_user_with_invitation function to match current schema
-- Migration: 029_fix_create_user_function.sql

-- Drop the old function first
DROP FUNCTION IF EXISTS public.create_user_with_invitation(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, user_role, VARCHAR, UUID);

-- Create the corrected function
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
BEGIN
  -- Generate full_name and initials
  v_full_name := p_first_name || ' ' || p_last_name;
  v_initials := UPPER(LEFT(p_first_name, 1)) || UPPER(LEFT(p_last_name, 1));
  
  -- Insert new user with all required columns
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
    p_created_by,
    NOW(),
    NOW()
  ) RETURNING id INTO v_user_id;

  -- Log the action
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
      'full_name', v_full_name
    )
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_with_invitation TO authenticated; 