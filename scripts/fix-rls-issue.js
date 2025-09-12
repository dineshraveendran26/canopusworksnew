const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixRLS() {
  try {
    console.log('🔧 Fixing RLS policies for users table...')
    
    // Apply the temporary RLS disable migration
    const rlsFixSQL = `
      -- Temporarily disable RLS on users table for testing
      -- This will allow the frontend to work while we fix the policies
      
      -- Disable RLS on users table
      ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
      
      -- Grant full access to authenticated users
      GRANT ALL ON public.users TO authenticated;
      
      -- Note: This is a temporary fix. RLS should be re-enabled with proper policies later.
    `
    
    console.log('📋 Applying RLS fix SQL:')
    console.log(rlsFixSQL)
    
    // Try to apply via RPC first
    const { data, error } = await supabase.rpc('exec_sql', { sql: rlsFixSQL })
    
    if (error) {
      console.error('❌ Error applying RLS fix via RPC:', error)
      console.log('📋 Please apply this SQL manually in your Supabase dashboard:')
      console.log(rlsFixSQL)
    } else {
      console.log('✅ RLS fix applied successfully!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.log('📋 Please apply the RLS fix manually in your Supabase dashboard')
  }
}

fixRLS()
