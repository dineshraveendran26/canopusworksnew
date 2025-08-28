-- Complete RLS fix - remove all policies and recreate them properly
-- First, disable RLS completely
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on users table (force removal)
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

-- Create simple, non-recursive policies
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role = 'administrator'
        )
    );

CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role = 'administrator'
        )
    );

CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role = 'administrator'
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated; 