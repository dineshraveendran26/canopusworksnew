-- Enhanced User Approval System with Notifications
-- Migration: 036_enhanced_user_approval_system.sql

-- Create notifications table for user approval requests
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'user_approval_request', 'user_approved', 'user_rejected', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- Store additional data like user details, role, etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
  'user_approval_request',
  'user_approved', 
  'user_rejected',
  'task_assigned',
  'task_completed',
  'comment_added'
);

-- Add indexes for notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
  );

-- Function to create user approval request notification
CREATE OR REPLACE FUNCTION public.create_user_approval_notification(
  p_user_id UUID,
  p_user_email VARCHAR(255),
  p_user_full_name VARCHAR(255),
  p_user_department VARCHAR(100),
  p_user_title VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_admin_ids UUID[];
BEGIN
  -- Get all administrator users
  SELECT ARRAY_AGG(id) INTO v_admin_ids 
  FROM public.users 
  WHERE role = 'administrator' AND is_active = TRUE;
  
  -- Create notification for each admin
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
      'A new user has registered and requires approval.',
      jsonb_build_object(
        'pending_user_id', p_user_id,
        'pending_user_email', p_user_email,
        'pending_user_full_name', p_user_full_name,
        'pending_user_department', p_user_department,
        'pending_user_title', p_user_title
      )
    ) RETURNING id INTO v_notification_id;
  END LOOP;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve a user
CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id UUID,
  p_approved_by UUID,
  p_new_role user_role DEFAULT 'viewer',
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_user_full_name VARCHAR(255);
BEGIN
  -- Get user details
  SELECT email, full_name INTO v_user_email, v_user_full_name
  FROM public.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
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
  
  -- Create approval notification for the user
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
    'Your account has been approved. You can now reset your password and log in.',
    jsonb_build_object(
      'approved_by', p_approved_by,
      'assigned_role', p_new_role
    )
  );
  
  -- Send password reset email (this will be handled by Supabase Auth)
  -- The user will receive a password reset email automatically
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a user
CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id UUID,
  p_rejected_by UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email VARCHAR(255);
  v_user_full_name VARCHAR(255);
BEGIN
  -- Get user details
  SELECT email, full_name INTO v_user_email, v_user_full_name
  FROM public.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Mark notifications as read
  UPDATE public.notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE metadata->>'pending_user_id' = p_user_id::text
  AND type = 'user_approval_request';
  
  -- Create rejection notification for the user
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
    'Your account registration has been rejected.',
    jsonb_build_object(
      'rejected_by', p_rejected_by,
      'rejection_reason', p_rejection_reason
    )
  );
  
  -- Note: We don't delete the user record, just keep them inactive
  -- This allows for potential future approval or audit trail
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id AND is_read = FALSE;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing create_user_profile function to set is_active = FALSE by default
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_initials TEXT,
  user_role TEXT,
  user_department TEXT,
  user_phone TEXT DEFAULT NULL,
  user_location TEXT DEFAULT NULL,
  user_join_date DATE DEFAULT CURRENT_DATE,
  user_status TEXT DEFAULT 'active',
  user_avatar_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_title VARCHAR(255) := 'Employee'; -- Default title
BEGIN
  -- Insert user profile with is_active = FALSE for new registrations
  INSERT INTO public.users (
    id, email, full_name, initials, role, department, 
    phone, location, join_date, status, avatar_url, is_active
  ) VALUES (
    user_id, user_email, user_full_name, user_initials, 
    user_role::user_role, user_department, user_phone, 
    user_location, user_join_date, user_status::user_status, 
    user_avatar_url, FALSE -- Set to FALSE for approval workflow
  );
  
  -- Create approval notification for administrators
  PERFORM public.create_user_approval_notification(
    user_id, user_email, user_full_name, user_department, v_title
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for pending user approvals (for admin dashboard)
CREATE OR REPLACE VIEW public.pending_user_approvals AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.department,
  u.phone,
  u.join_date,
  u.created_at,
  n.id as notification_id,
  n.created_at as request_date
FROM public.users u
JOIN public.notifications n ON n.metadata->>'pending_user_id' = u.id::text
WHERE u.is_active = FALSE 
AND n.type = 'user_approval_request'
AND n.is_read = FALSE;

-- Grant permissions
GRANT SELECT ON public.pending_user_approvals TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_approval_notification(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user(UUID, UUID, user_role, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(UUID) TO authenticated;
