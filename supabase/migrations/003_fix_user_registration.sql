-- Migration: 003_fix_user_registration.sql
-- Fix user registration by allowing new users to create their own profile

-- First, let's drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can create users based on permissions" ON public.users;

-- Create a new policy that allows users to create their own profile during registration
CREATE POLICY "Users can create own profile during registration" ON public.users
  FOR INSERT WITH CHECK (
    -- Allow if the user is creating their own profile (same ID as authenticated user)
    auth.uid() = id
  );

-- Also allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (
    auth.uid() = id
  );

-- Keep the existing read policy but make it more permissive for basic user info
DROP POLICY IF EXISTS "Users can view users based on permissions" ON public.users;

CREATE POLICY "Users can view basic user info" ON public.users
  FOR SELECT USING (
    -- Allow users to see basic info about other users (for assignments, etc.)
    -- But restrict sensitive information based on role
    CASE 
      WHEN auth.uid() = id THEN true -- Users can always see their own profile
      WHEN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'administrator'
      ) THEN true -- Admins can see all users
      WHEN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'manager'
      ) THEN true -- Managers can see all users
      ELSE false -- Viewers cannot see other users
    END
  );

-- Create a function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called when a new user is created in auth.users
  -- We'll use it to automatically create the user profile
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create user profile when auth user is created
-- This will be handled by our application logic instead
-- But we'll keep the function for future use if needed

-- Update the permissions to ensure new users get basic permissions
-- This is already handled by the permissions table, but let's verify

-- Let's also create a more permissive policy for the initial setup
-- This allows the first admin user to be created
CREATE POLICY "Allow first user creation" ON public.users
  FOR INSERT WITH CHECK (
    -- Allow if this is the first user (no existing users)
    (SELECT COUNT(*) FROM public.users) = 0
    OR
    -- Or if the user is creating their own profile
    auth.uid() = id
  );

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.permissions TO authenticated;

-- Ensure the auth.uid() function is available
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated; 