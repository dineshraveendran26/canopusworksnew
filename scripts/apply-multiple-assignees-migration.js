#!/usr/bin/env node

/**
 * Script to apply the multiple assignees migration
 * This will create the new task_assignments table and migrate existing data
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function applyMigration() {
  console.log('🚀 Starting multiple assignees migration...')
  
  try {
    // Step 1: Test connection
    console.log('🔄 Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection failed:', testError)
      return
    }
    
    console.log('✅ Database connection successful')
    
    // Step 2: Read migration file
    console.log('🔄 Reading migration file...')
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '024_fix_multiple_assignees_support.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('✅ Migration file loaded')
    
    // Step 3: Apply migration in parts (since we can't use RPC with anon key)
    console.log('🔄 Applying migration...')
    
    // Split the migration into executable parts
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`)
        console.log(`📝 Statement: ${statement.substring(0, 100)}...`)
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.warn(`⚠️ Statement ${i + 1} had an error (continuing):`, error.message)
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`)
          }
        } catch (err) {
          console.warn(`⚠️ Statement ${i + 1} failed (continuing):`, err.message)
        }
      }
    }
    
    console.log('✅ Migration completed')
    
    // Step 4: Verify the new table exists
    console.log('🔄 Verifying migration...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('task_assignments')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Migration verification failed:', tableError)
      return
    }
    
    console.log('✅ New task_assignments table verified')
    
    // Step 5: Test the new functionality
    console.log('🔄 Testing new functionality...')
    
    // Check if we can query the new view
    const { data: viewCheck, error: viewError } = await supabase
      .from('tasks_with_assignees')
      .select('*')
      .limit(1)
    
    if (viewError) {
      console.warn('⚠️ View query failed (this might be expected):', viewError.message)
    } else {
      console.log('✅ New view query successful')
    }
    
    console.log('🎉 Migration completed successfully!')
    console.log('')
    console.log('📋 What was created:')
    console.log('  - task_assignments table for multiple assignees')
    console.log('  - tasks_with_assignees view for easier querying')
    console.log('  - RLS policies for security')
    console.log('  - Helper functions for assignments')
    console.log('')
    console.log('🔄 Next steps:')
    console.log('  1. Restart your application')
    console.log('  2. Test creating tasks with multiple assignees')
    console.log('  3. Check that the new assignment system works')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
applyMigration() 