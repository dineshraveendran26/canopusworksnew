-- Fix the get_user_permissions function with correct column names
-- The permissions table has: role, resource, action (not table_name, operation)

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_user_permissions(user_id uuid);

-- Recreate the function with correct column names
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
RETURNS TABLE(
    resource text,
    action text,
    granted boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.resource::text,
        p.action::text,
        CASE 
            WHEN u.role = 'administrator' THEN true
            WHEN u.role = 'manager' AND p.action != 'delete' AND p.resource != 'users' THEN true
            WHEN u.role = 'viewer' AND p.action = 'read' THEN true
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