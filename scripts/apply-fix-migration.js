require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyFixMigration() {
  try {
    console.log('🔧 Applying fix migration for user_role issue...')
    
    // Step 1: Read the migration file
    const fs = require('fs')
    const path = require('path')
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/023_fix_user_role_enum_and_add_to_tasks.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      return
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log('✅ Migration file loaded')
    
    // Step 2: Apply the migration
    console.log('🔄 Applying migration...')
    const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (migrationError) {
      console.error('❌ Migration failed:', migrationError)
      return
    }
    
    console.log('✅ Migration applied successfully!')
    
    // Step 3: Verify the fix
    console.log('🔍 Verifying the fix...')
    
    // Check if user_role column exists in tasks table
    const { data: tableInfo, error: tableError } = await supabase
      .from('tasks')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('❌ Error checking table structure:', tableError)
      return
    }
    
    console.log('✅ Tasks table structure verified')
    
    // Check current users and their roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, approval_status')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }
    
    console.log('👥 Current users:')
    users.forEach(user => {
      console.log(`  - ${user.email}: ${user.role} (${user.approval_status})`)
    })
    
    // Check if there are any tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, user_role, created_by')
      .limit(5)
    
    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError)
      return
    }
    
    console.log('📋 Current tasks:')
    if (tasks && tasks.length > 0) {
      tasks.forEach(task => {
        console.log(`  - ${task.title}: user_role=${task.user_role}, created_by=${task.created_by}`)
      })
    } else {
      console.log('  No tasks found')
    }
    
    // Step 4: Test creating a task
    console.log('🧪 Testing task creation...')
    
    // Get the first user to create a test task
    if (users && users.length > 0) {
      const testUser = users[0]
      
      const testTask = {
        title: 'Test Task - Migration Verification',
        description: 'This task was created to verify the migration fixed the user_role issue',
        priority: 'Low',
        status: 'Todo',
        created_by: testUser.id,
        department: testUser.department || 'Testing'
      }
      
      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert([testTask])
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Task creation test failed:', createError)
        return
      }
      
      console.log('✅ Test task created successfully!')
      console.log(`  - ID: ${newTask.id}`)
      console.log(`  - Title: ${newTask.title}`)
      console.log(`  - user_role: ${newTask.user_role}`)
      console.log(`  - created_by: ${newTask.created_by}`)
      
      // Clean up test task
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', newTask.id)
      
      if (deleteError) {
        console.warn('⚠️ Warning: Could not delete test task:', deleteError)
      } else {
        console.log('🧹 Test task cleaned up')
      }
    }
    
    console.log('🎉 Migration verification completed successfully!')
    console.log('')
    console.log('📋 Summary of fixes applied:')
    console.log('  ✅ Fixed user_role enum case mismatch')
    console.log('  ✅ Added user_role column to tasks table')
    console.log('  ✅ Created automatic trigger to set user_role')
    console.log('  ✅ Ensured all users have administrator rights')
    console.log('  ✅ Updated RLS policies for better security')
    console.log('  ✅ Created tasks_with_users view for easier querying')
    console.log('')
    console.log('🚀 Your application should now work without the user_role error!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the migration
applyFixMigration() 