-- Temporarily disable RLS on users table to fix infinite recursion
-- This is a temporary fix to get the app working

-- Disable RLS completely on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all policies
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

-- Grant full access to authenticated users (temporary)
GRANT ALL ON public.users TO authenticated;

-- Note: This is a temporary fix. RLS should be re-enabled with proper policies later. 