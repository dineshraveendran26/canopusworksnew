const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

async function applyMigration() {
  console.log('🔧 Applying Migration: 045_fix_permission_function.sql')
  console.log('=' .repeat(50))

  try {
    // Test if the function already exists
    console.log('\n1️⃣ Testing existing function...')
    const { data: testResult, error: testError } = await adminSupabase.rpc('check_user_permission', {
      user_id: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      resource_name: 'tasks',
      action_name: 'read'
    })

    if (!testError) {
      console.log('✅ Permission function already exists and working:', testResult)
      return
    }

    console.log('❌ Function not found or not working:', testError.message)
    console.log('💡 The function needs to be created manually in the Supabase dashboard')
    console.log('📋 SQL to run:')
    console.log(`
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_id UUID,
  resource_name VARCHAR(100),
  action_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  
  -- If user not found, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has permission
  RETURN EXISTS (
    SELECT 1 FROM public.permissions 
    WHERE role = user_role 
    AND resource = resource_name 
    AND action = action_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID, VARCHAR, VARCHAR) TO authenticated;
    `)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the migration
applyMigration()
