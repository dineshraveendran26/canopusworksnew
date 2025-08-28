-- Initial Setup for Canopus Works
-- Migration: 004_initial_setup.sql

-- This migration will be run after the user signs up for the first time
-- It will automatically promote the first user to administrator role

-- Function to automatically promote first user to administrator
CREATE OR REPLACE FUNCTION public.promote_first_user_to_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user in the system
  IF (SELECT COUNT(*) FROM public.users) = 1 THEN
    -- Promote to administrator
    NEW.role = 'administrator';
    NEW.email_verified = TRUE;
    
    -- Log the automatic promotion
    INSERT INTO public.user_audit_log (
      user_id, action, table_name, record_id, new_values
    ) VALUES (
      NEW.id, 'auto_promoted_to_admin', 'users', NEW.id,
      jsonb_build_object('role', 'administrator', 'reason', 'First user in system')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically promote first user
CREATE TRIGGER promote_first_user_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.promote_first_user_to_admin();

-- Insert some sample departments for better organization
INSERT INTO public.team_members (full_name, email, role, department, position, created_by) VALUES
  ('Sample Team Member 1', 'member1@example.com', 'Worker', 'Production', 'Operator', NULL),
  ('Sample Team Member 2', 'member2@example.com', 'Worker', 'Quality Control', 'Inspector', NULL)
ON CONFLICT DO NOTHING;

-- Create a function to sync Supabase auth users with our users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists in our users table
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    -- Insert into our users table with default viewer role
    INSERT INTO public.users (
      id, email, first_name, last_name, role, email_verified
    ) VALUES (
      NEW.id, NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      'viewer',
      NEW.email_confirmed_at IS NOT NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'administrator' FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is manager or admin
CREATE OR REPLACE FUNCTION public.is_current_user_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('administrator', 'manager') FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 