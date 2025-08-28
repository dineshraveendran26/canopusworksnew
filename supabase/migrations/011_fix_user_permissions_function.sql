-- Fix the get_user_permissions function type casting issue
-- The problem is: operator does not exist: character varying = user_role

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_user_permissions(user_id uuid);

-- Recreate the function with proper type casting
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
RETURNS TABLE(
    table_name text,
    operation text,
    granted boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.table_name::text,
        p.operation::text,
        CASE 
            WHEN u.role = 'administrator' THEN true
            WHEN u.role = 'manager' AND p.operation != 'DELETE' AND p.table_name != 'users' THEN true
            WHEN u.role = 'viewer' AND p.operation = 'SELECT' THEN true
            ELSE false
        END as granted
    FROM public.permissions p
    CROSS JOIN public.users u
    WHERE u.id = user_id
    AND u.approval_status = 'approved';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;

-- Test the function (optional - can be removed)
-- SELECT * FROM public.get_user_permissions('dbc4b558-f64d-409b-834a-a533a413e039'); 