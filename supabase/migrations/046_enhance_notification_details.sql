-- Migration: 046_enhance_notification_details.sql
-- Enhance notification messages with specific user and action details

-- Function to create detailed approval notification for administrators
CREATE OR REPLACE FUNCTION public.create_detailed_approval_notification(
  p_user_id UUID,
  p_user_email VARCHAR(255),
  p_user_full_name VARCHAR(255),
  p_user_department VARCHAR(255),
  p_user_title VARCHAR(255)
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- Get all administrator user IDs
  SELECT ARRAY_AGG(id) INTO v_admin_ids
  FROM public.users 
  WHERE role = 'administrator' AND is_active = TRUE;
  
  -- Create notification for each administrator
  FOREACH v_admin_id IN ARRAY v_admin_ids
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      v_admin_id,
      'user_approval_request',
      'New User Registration Request',
      format('User %s (%s) from %s department has registered and requires approval.', 
             p_user_full_name, p_user_email, p_user_department),
      jsonb_build_object(
        'pending_user_id', p_user_id,
        'pending_user_email', p_user_email,
        'pending_user_full_name', p_user_full_name,
        'pending_user_department', p_user_department,
        'pending_user_title', p_user_title,
        'request_date', NOW()
      )
    ) RETURNING id INTO v_notification_id;
  END LOOP;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to approve a user with detailed notification
CREATE OR REPLACE FUNCTION public.approve_user_enhanced(
  p_user_id UUID,
  p_approved_by UUID,
  p_new_role user_role DEFAULT 'viewer',
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_user_full_name VARCHAR(255);
  v_approver_name VARCHAR(255);
  v_approver_email VARCHAR(255);
BEGIN
  -- Get user details
  SELECT email, full_name INTO v_user_email, v_user_full_name
  FROM public.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Get approver details
  SELECT email, full_name INTO v_approver_email, v_approver_name
  FROM public.users 
  WHERE id = p_approved_by;
  
  -- Update user status
  UPDATE public.users 
  SET 
    is_active = TRUE,
    role = p_new_role,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Mark notifications as read
  UPDATE public.notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE metadata->>'pending_user_id' = p_user_id::text
  AND type = 'user_approval_request';
  
  -- Create detailed approval notification for the user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_user_id,
    'user_approved',
    'Account Approved',
    format('Your account has been approved by %s (%s). You have been assigned the %s role. You can now reset your password and log in.', 
           v_approver_name, v_approver_email, p_new_role),
    jsonb_build_object(
      'approved_by', p_approved_by,
      'approver_name', v_approver_name,
      'approver_email', v_approver_email,
      'assigned_role', p_new_role,
      'approval_date', NOW()
    )
  );
  
  -- Create detailed approval notification for all administrators
  PERFORM public.create_admin_approval_notification(
    p_user_id, v_user_full_name, v_user_email, p_new_role, v_approver_name
  );
  
  -- Send password reset email (this will be handled by Supabase Auth)
  -- The user will receive a password reset email automatically
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin approval notification
CREATE OR REPLACE FUNCTION public.create_admin_approval_notification(
  p_user_id UUID,
  p_user_full_name VARCHAR(255),
  p_user_email VARCHAR(255),
  p_assigned_role user_role,
  p_approver_name VARCHAR(255)
) RETURNS VOID AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- Get all administrator user IDs
  SELECT ARRAY_AGG(id) INTO v_admin_ids
  FROM public.users 
  WHERE role = 'administrator' AND is_active = TRUE;
  
  -- Create notification for each administrator
  FOREACH v_admin_id IN ARRAY v_admin_ids
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      v_admin_id,
      'user_approval_completed',
      'User Approval Completed',
      format('User %s (%s) has been approved by %s and assigned the %s role.', 
             p_user_full_name, p_user_email, p_approver_name, p_assigned_role),
      jsonb_build_object(
        'approved_user_id', p_user_id,
        'approved_user_name', p_user_full_name,
        'approved_user_email', p_user_email,
        'assigned_role', p_assigned_role,
        'approver_name', p_approver_name,
        'approval_date', NOW()
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to reject a user with detailed notification
CREATE OR REPLACE FUNCTION public.reject_user_enhanced(
  p_user_id UUID,
  p_rejected_by UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_user_full_name VARCHAR(255);
  v_rejecter_name VARCHAR(255);
  v_rejecter_email VARCHAR(255);
BEGIN
  -- Get user details
  SELECT email, full_name INTO v_user_email, v_user_full_name
  FROM public.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Get rejecter details
  SELECT email, full_name INTO v_rejecter_email, v_rejecter_name
  FROM public.users 
  WHERE id = p_rejected_by;
  
  -- Mark notifications as read
  UPDATE public.notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE metadata->>'pending_user_id' = p_user_id::text
  AND type = 'user_approval_request';
  
  -- Create detailed rejection notification for the user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_user_id,
    'user_rejected',
    'Account Registration Rejected',
    format('Your account registration has been rejected by %s (%s). Reason: %s', 
           v_rejecter_name, v_rejecter_email, p_rejection_reason),
    jsonb_build_object(
      'rejected_by', p_rejected_by,
      'rejecter_name', v_rejecter_name,
      'rejecter_email', v_rejecter_email,
      'rejection_reason', p_rejection_reason,
      'rejection_date', NOW()
    )
  );
  
  -- Create detailed rejection notification for all administrators
  PERFORM public.create_admin_rejection_notification(
    p_user_id, v_user_full_name, v_user_email, p_rejection_reason, v_rejecter_name
  );
  
  -- Note: We don't delete the user record, just keep them inactive
  -- This allows for potential future approval or audit trail
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin rejection notification
CREATE OR REPLACE FUNCTION public.create_admin_rejection_notification(
  p_user_id UUID,
  p_user_full_name VARCHAR(255),
  p_user_email VARCHAR(255),
  p_rejection_reason TEXT,
  p_rejecter_name VARCHAR(255)
) RETURNS VOID AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- Get all administrator user IDs
  SELECT ARRAY_AGG(id) INTO v_admin_ids
  FROM public.users 
  WHERE role = 'administrator' AND is_active = TRUE;
  
  -- Create notification for each administrator
  FOREACH v_admin_id IN ARRAY v_admin_ids
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      v_admin_id,
      'user_rejection_completed',
      'User Rejection Completed',
      format('User %s (%s) has been rejected by %s. Reason: %s', 
             p_user_full_name, p_user_email, p_rejecter_name, p_rejection_reason),
      jsonb_build_object(
        'rejected_user_id', p_user_id,
        'rejected_user_name', p_user_full_name,
        'rejected_user_email', p_user_email,
        'rejection_reason', p_rejection_reason,
        'rejecter_name', p_rejecter_name,
        'rejection_date', NOW()
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_detailed_approval_notification(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user_enhanced(UUID, UUID, user_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_approval_notification(UUID, VARCHAR, VARCHAR, user_role, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user_enhanced(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_rejection_notification(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR) TO authenticated;
