-- Migration: 004_create_user_profile_function.sql
-- Create a function to handle user profile creation with proper permissions

-- Create a function that allows users to create their own profile
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
BEGIN
  -- Check if the user is authenticated and matches the profile being created
  IF auth.uid() IS NULL OR auth.uid() != user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Insert the user profile
  INSERT INTO public.users (
    id, email, full_name, initials, role, department, 
    phone, location, join_date, status, avatar_url
  ) VALUES (
    user_id, user_email, user_full_name, user_initials, user_role::user_role, user_department,
    user_phone, user_location, user_join_date, user_status::user_status, user_avatar_url
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;

-- Create a function to get or create user profile
CREATE OR REPLACE FUNCTION public.get_or_create_user_profile()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  initials TEXT,
  role TEXT,
  department TEXT,
  phone TEXT,
  location TEXT,
  join_date DATE,
  status TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  auth_user_id UUID;
  user_profile RECORD;
BEGIN
  -- Get the authenticated user ID
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Try to get existing profile
  SELECT * INTO user_profile FROM public.users WHERE id = auth_user_id;
  
  -- If profile doesn't exist, return empty result
  -- The profile will be created by the application when needed
  IF user_profile IS NULL THEN
    RETURN;
  END IF;
  
  -- Return the profile
  RETURN QUERY SELECT 
    user_profile.id,
    user_profile.email,
    user_profile.full_name,
    user_profile.initials,
    user_profile.role::TEXT,
    user_profile.department,
    user_profile.phone,
    user_profile.location,
    user_profile.join_date,
    user_profile.status::TEXT,
    user_profile.avatar_url,
    user_profile.created_at,
    user_profile.updated_at
  FROM public.users WHERE id = auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_user_profile TO authenticated;

-- Update the RLS policies to be more permissive for user profile creation
DROP POLICY IF EXISTS "Users can create own profile during registration" ON public.users;
DROP POLICY IF EXISTS "Allow first user creation" ON public.users;

-- Create a more permissive policy for user creation
CREATE POLICY "Allow user profile creation" ON public.users
  FOR INSERT WITH CHECK (
    -- Allow if this is the first user (no existing users)
    (SELECT COUNT(*) FROM public.users) = 0
    OR
    -- Or if the user is creating their own profile
    auth.uid() = id
    OR
    -- Or if the authenticated user is an admin
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'administrator'
    )
  );

-- Ensure the auth schema is accessible
GRANT USAGE ON SCHEMA auth TO authenticated; 