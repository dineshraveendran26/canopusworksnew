-- Fix RLS policies for users table to allow proper user management
-- Migration: 048_fix_users_rls_policies.sql

-- First, disable RLS temporarily to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on users table
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.users';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies for users table
-- 1. Users can view their own profile
CREATE POLICY "users_select_own_profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- 2. Administrators can view all users
CREATE POLICY "users_select_admin_all" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- 3. Users can update their own profile (but not role)
CREATE POLICY "users_update_own_profile" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM public.users WHERE id = auth.uid())
    );

-- 4. Administrators can update all users
CREATE POLICY "users_update_admin_all" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- 5. Users can create their own profile during registration
CREATE POLICY "users_insert_own_profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Administrators can create users
CREATE POLICY "users_insert_admin_all" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- 7. Administrators can delete users
CREATE POLICY "users_delete_admin_all" ON public.users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;

-- Create a function to check if user is admin (for use in policies)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_id AND role = 'administrator'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
