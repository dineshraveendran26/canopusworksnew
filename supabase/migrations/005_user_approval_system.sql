-- Migration: 005_user_approval_system.sql
-- Add user approval system with admin notifications

-- Create user approval status enum FIRST
CREATE TYPE user_approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create notification types enum
CREATE TYPE notification_type AS ENUM ('user_registration', 'user_approval', 'user_rejection', 'system_alert');

-- Add approval status to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approval_status user_approval_status DEFAULT 'pending';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Create admin notifications table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Insert default admin user (dineshraveendran26@gmail.com)
INSERT INTO public.users (
  id, 
  email, 
  full_name, 
  initials, 
  role, 
  department, 
  phone, 
  location, 
  join_date, 
  status, 
  avatar_url,
  approval_status,
  approved_by,
  approved_at
) VALUES (
  uuid_generate_v4(),
  'dineshraveendran26@gmail.com',
  'Dinesh Raveendran',
  'DR',
  'administrator',
  'Management',
  NULL,
  NULL,
  CURRENT_DATE,
  'active',
  NULL,
  'approved',
  NULL,
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'administrator',
  approval_status = 'approved',
  approved_at = NOW();

-- Create function to create admin notification
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  notification_type notification_type,
  title_text VARCHAR(255),
  message_text TEXT,
  target_user_id UUID,
  related_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_user_id FROM public.users 
  WHERE email = 'dineshraveendran26@gmail.com' AND role = 'administrator' 
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;
  
  -- Create notification
  INSERT INTO public.admin_notifications (
    type, title, message, user_id, related_user_id
  ) VALUES (
    notification_type, title_text, message_text, admin_user_id, related_user_id
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to approve/reject user
CREATE OR REPLACE FUNCTION public.approve_user(
  target_user_id UUID,
  approval_action user_approval_status,
  admin_user_id UUID,
  notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  target_user_email TEXT;
  target_user_name TEXT;
BEGIN
  -- Verify admin user
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = admin_user_id AND role = 'administrator'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Get target user info
  SELECT email, full_name INTO target_user_email, target_user_name
  FROM public.users WHERE id = target_user_id;
  
  IF target_user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update user approval status
  UPDATE public.users SET
    approval_status = approval_action,
    approved_by = admin_user_id,
    approved_at = CASE WHEN approval_action = 'approved' THEN NOW() ELSE NULL END,
    approval_notes = notes
  WHERE id = target_user_id;
  
  -- Create notification for the approved/rejected user
  INSERT INTO public.admin_notifications (
    type, title, message, user_id, related_user_id
  ) VALUES (
    CASE 
      WHEN approval_action = 'approved' THEN 'user_approval'
      ELSE 'user_rejection'
    END,
    CASE 
      WHEN approval_action = 'approved' THEN 'Account Approved'
      ELSE 'Account Rejected'
      END,
    CASE 
      WHEN approval_action = 'approved' THEN 
        'Your account has been approved. You can now access the dashboard.'
      ELSE 
        'Your account has been rejected. Please contact support for more information.'
    END,
    target_user_id,
    admin_user_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for new tables
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can see all notifications
CREATE POLICY "Admins can view all notifications" ON public.admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Users can see their own notifications
CREATE POLICY "Users can view own notifications" ON public.admin_notifications
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Only admins can create notifications
CREATE POLICY "Only admins can create notifications" ON public.admin_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Only admins can update notifications
CREATE POLICY "Only admins can update notifications" ON public.admin_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Grant permissions
GRANT ALL ON public.admin_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_user TO authenticated;

-- Update existing RLS policies to check approval status
DROP POLICY IF EXISTS "Users can view tasks based on permissions" ON public.tasks;
CREATE POLICY "Approved users can view tasks based on permissions" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND approval_status = 'approved'
    ) AND
    public.check_user_permission(auth.uid(), 'tasks', 'read')
  );

-- Similar updates for other tables...
DROP POLICY IF EXISTS "Users can view subtasks based on permissions" ON public.subtasks;
CREATE POLICY "Approved users can view subtasks based on permissions" ON public.subtasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND approval_status = 'approved'
    ) AND
    public.check_user_permission(auth.uid(), 'subtasks', 'read')
  );

-- Update user profile creation to trigger admin notification
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID, user_email TEXT, user_full_name TEXT, user_initials TEXT,
  user_role TEXT, user_department TEXT, user_phone TEXT DEFAULT NULL,
  user_location TEXT DEFAULT NULL, user_join_date DATE DEFAULT CURRENT_DATE,
  user_status TEXT DEFAULT 'active', user_avatar_url TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  notification_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != user_id THEN RETURN FALSE; END IF;
  
  INSERT INTO public.users (id, email, full_name, initials, role, department, phone, location, join_date, status, avatar_url, approval_status)
  VALUES (user_id, user_email, user_full_name, user_initials, user_role::user_role, user_department, user_phone, user_location, user_join_date, user_status::user_status, user_avatar_url, 'pending');
  
  -- Create admin notification for new user registration
  SELECT public.create_admin_notification(
    'user_registration',
    'New User Registration',
    'New user ' || user_full_name || ' (' || user_email || ') has registered and is waiting for approval.',
    user_id,
    user_id
  ) INTO notification_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'Error creating user profile: %', SQLERRM; 
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 