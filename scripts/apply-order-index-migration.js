const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  try {
    console.log('🚀 Applying task order_index migration...')
    
    // Read the migration file
    const fs = require('fs')
    const migrationPath = './supabase/migrations/050_add_task_order_index.sql'
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📋 Migration SQL:')
    console.log(migrationSQL)
    
    // Apply the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Error applying migration:', error)
      console.log('📋 Please apply this SQL manually in your Supabase dashboard:')
      console.log(migrationSQL)
    } else {
      console.log('✅ Migration applied successfully!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.log('📋 Please apply the migration manually in your Supabase dashboard')
  }
}

applyMigration()
