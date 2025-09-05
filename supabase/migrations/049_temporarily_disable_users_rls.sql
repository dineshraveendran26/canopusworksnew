-- Temporarily disable RLS on users table for testing
-- This will allow the frontend to work while we fix the policies

-- Disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON public.users TO authenticated;

-- Note: This is a temporary fix. RLS should be re-enabled with proper policies later.
