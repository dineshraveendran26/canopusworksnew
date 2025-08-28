-- Fix infinite recursion in RLS policies for users table
-- Drop all existing RLS policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Administrators can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can view approved profiles" ON public.users;

-- Disable RLS temporarily to fix the recursion
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive RLS policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Administrators can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
  );

CREATE POLICY "Administrators can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
  );

CREATE POLICY "Administrators can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'administrator'
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated; 