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

async function diagnoseUserRoleIssue() {
  try {
    console.log('🔍 Diagnosing user_role issue...')
    console.log('📍 Using URL:', supabaseUrl)
    
    // Step 1: Check if we can access the database
    console.log('🔍 Testing database access...')
    
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('tasks')
        .select('*')
        .limit(0)
      
      if (tableError) {
        console.log('❌ Cannot access tasks table:', tableError.message)
        
        if (tableError.message.includes('permission denied')) {
          console.log('🔒 Permission issue - need to authenticate first')
          return
        }
      } else {
        console.log('✅ Can access tasks table')
      }
    } catch (error) {
      console.log('❌ Error accessing tasks table:', error.message)
    }
    
    // Step 2: Check if we can access users table
    console.log('🔍 Testing users table access...')
    
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(1)
      
      if (usersError) {
        console.log('❌ Cannot access users table:', usersError.message)
      } else {
        console.log('✅ Can access users table')
        console.log('👥 Sample user:', users[0])
      }
    } catch (error) {
      console.log('❌ Error accessing users table:', error.message)
    }
    
    // Step 3: Try to create a minimal task to see the exact error
    console.log('🔍 Testing minimal task creation...')
    
    try {
      // First, let's see what the current user context is
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.log('❌ Not authenticated:', authError.message)
        console.log('🔍 This explains why we can\'t create tasks')
        return
      }
      
      if (!user) {
        console.log('❌ No authenticated user found')
        console.log('🔍 You need to log in first to test task creation')
        return
      }
      
      console.log('✅ Authenticated as:', user.email)
      console.log('🆔 User ID:', user.id)
      
      // Now try to create a minimal task
      const minimalTask = {
        title: 'Diagnostic Test Task',
        description: 'Testing minimal task creation',
        priority: 'Low',
        status: 'Todo',
        created_by: user.id
      }
      
      console.log('📤 Attempting to create task with data:', minimalTask)
      
      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert([minimalTask])
        .select()
        .single()
      
      if (insertError) {
        console.log('❌ Task creation failed:', insertError.message)
        
        // Check if it's the user_role issue
        if (insertError.message.includes('user_role')) {
          console.log('🎯 FOUND THE ISSUE! user_role field is being added somewhere')
          
          if (insertError.message.includes('Administrator')) {
            console.log('🔍 The field being added is: user_role = "Administrator"')
            console.log('🔍 But the enum expects: "administrator" (lowercase)')
          }
          
          console.log('')
          console.log('🚨 ROOT CAUSE IDENTIFIED:')
          console.log('   The user_role field is being automatically added to your task data')
          console.log('   This could be happening in:')
          console.log('   1. A database trigger or function')
          console.log('   2. A database view that wraps the tasks table')
          console.log('   3. Your application code (though we didn\'t see it)')
          console.log('   4. A Supabase RLS policy or function')
          console.log('')
          console.log('🔧 NEXT STEPS:')
          console.log('   1. Check your database for triggers/functions that add user_role')
          console.log('   2. Check if you\'re using a view instead of the direct table')
          console.log('   3. Look for any middleware that modifies task data')
          console.log('   4. Check Supabase dashboard for any custom functions')
          
        } else {
          console.log('🔍 Different error - not related to user_role')
        }
      } else {
        console.log('✅ SUCCESS! Task creation worked with minimal data')
        console.log('📋 New task:', newTask)
        
        // Clean up
        await supabase.from('tasks').delete().eq('id', newTask.id)
        console.log('🧹 Test task cleaned up')
        
        console.log('')
        console.log('🎯 CONCLUSION:')
        console.log('   Task creation works with minimal data')
        console.log('   The user_role field is being added somewhere in the process')
        console.log('   You need to find where this field is being injected')
      }
      
    } catch (error) {
      console.log('❌ Error during task creation test:', error.message)
    }
    
    // Step 4: Check if there are any database views
    console.log('🔍 Checking for database views...')
    
    try {
      // Try to query information_schema to see if there are views
      const { data: views, error: viewsError } = await supabase
        .from('information_schema.views')
        .select('table_name, view_definition')
        .eq('table_schema', 'public')
        .eq('table_name', 'tasks')
      
      if (viewsError) {
        console.log('❌ Cannot access information_schema:', viewsError.message)
      } else if (views && views.length > 0) {
        console.log('🎯 FOUND A VIEW! You\'re using a view instead of the direct table')
        console.log('📋 View definition:', views[0].view_definition)
        console.log('🔍 This view might be adding the user_role field')
      } else {
        console.log('✅ No views found - using direct table')
      }
    } catch (error) {
      console.log('❌ Error checking views:', error.message)
    }
    
    console.log('')
    console.log('📋 DIAGNOSIS SUMMARY:')
    console.log('  ✅ Database connection working')
    console.log('  ✅ Environment variables configured')
    
    if (insertError && insertError.message.includes('user_role')) {
      console.log('  ❌ user_role field being added automatically')
      console.log('  🔍 Need to find where this field is being injected')
    } else {
      console.log('  ✅ Task creation working or different issue')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the diagnosis
diagnoseUserRoleIssue() 