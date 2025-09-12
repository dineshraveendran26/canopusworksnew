const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Read the migration file
    const migrationPath = 'supabase/migrations/048_fix_users_rls_policies.sql'
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('🔍 Applying migration: 048_fix_users_rls_policies.sql')
    console.log('SQL Preview (first 200 chars):', migrationSQL.substring(0, 200) + '...')
    
    // Apply the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      console.log('\n📝 Manual SQL to execute in Supabase Dashboard:')
      console.log('=' .repeat(80))
      console.log(migrationSQL)
      console.log('=' .repeat(80))
    } else {
      console.log('✅ Migration applied successfully!')
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error)
    console.log('\n📝 Manual SQL to execute in Supabase Dashboard:')
    console.log('=' .repeat(80))
    console.log(fs.readFileSync('supabase/migrations/048_fix_users_rls_policies.sql', 'utf8'))
    console.log('=' .repeat(80))
  }
}

applyMigration()
