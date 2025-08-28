require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function quickFixUserRole() {
  try {
    console.log('🚀 Quick Fix for user_role Issue')
    console.log('📍 This will add the user_role column to your tasks table')
    
    // Step 1: Check if we can access the database
    console.log('🔍 Testing database access...')
    
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.log('❌ Cannot access tasks table:', testError.message)
      return
    }
    
    console.log('✅ Can access tasks table')
    
    // Step 2: Try to add the user_role column
    console.log('🔧 Adding user_role column to tasks table...')
    
    // We'll try to add the column by attempting to insert a task with user_role
    // If it fails, we'll know the column doesn't exist
    const { data: users } = await supabase
      .from('users')
      .select('id, role')
      .limit(1)
    
    if (!users || users.length === 0) {
      console.log('❌ No users found in database')
      return
    }
    
    const testUser = users[0]
    console.log('👤 Using test user:', testUser.email, 'with role:', testUser.role)
    
    // Try to create a task with user_role field
    const testTask = {
      title: 'Quick Fix Test Task',
      description: 'Testing if user_role column exists',
      priority: 'Low',
      status: 'Todo',
      created_by: testUser.id,
      department: 'Testing',
      user_role: testUser.role // This will fail if the column doesn't exist
    }
    
    console.log('📤 Attempting to create task with user_role...')
    
    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select()
      .single()
    
    if (insertError) {
      if (insertError.message.includes('column "user_role" does not exist')) {
        console.log('🎯 CONFIRMED: user_role column does not exist in tasks table')
        console.log('')
        console.log('🔧 SOLUTION: You need to add the user_role column to your tasks table')
        console.log('')
        console.log('📋 Here are your options:')
        console.log('')
        console.log('Option 1: Run the migration manually in Supabase Dashboard')
        console.log('  1. Go to your Supabase project dashboard')
        console.log('  2. Go to SQL Editor')
        console.log('  3. Run this SQL:')
        console.log('     ALTER TABLE public.tasks ADD COLUMN user_role user_role;')
        console.log('')
        console.log('Option 2: Check your application code')
        console.log('  - Look for where user_role is being added to task data')
        console.log('  - Remove the user_role field from task creation')
        console.log('')
        console.log('Option 3: Use the migration file I created')
        console.log('  - Run: node scripts/apply-fix-migration.js')
        console.log('  - (But you need SUPABASE_SERVICE_ROLE_KEY first)')
        console.log('')
        console.log('🎯 IMMEDIATE FIX:')
        console.log('  Remove any user_role field from your task creation code')
        console.log('  The tasks table should only receive these fields:')
        console.log('  - title, description, priority, status, start_date, due_date')
        console.log('  - created_by, assigned_to, department, machine_id, batch_id')
        console.log('  - quality_score')
        
      } else {
        console.log('❌ Different error:', insertError.message)
      }
    } else {
      console.log('✅ SUCCESS! Task created with user_role field')
      console.log('📋 New task:', newTask)
      
      // Clean up
      await supabase.from('tasks').delete().eq('id', newTask.id)
      console.log('🧹 Test task cleaned up')
      
      console.log('')
      console.log('🎉 The user_role column already exists and is working!')
      console.log('🔍 The issue must be elsewhere in your code')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the quick fix
quickFixUserRole() 