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

async function testTaskCreation() {
  try {
    console.log('🧪 Testing Task Creation (After Fix)')
    console.log('📍 This will test if task creation works without user_role field')
    
    // Step 1: Check database access
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
    
    // Step 2: Check if there are any users
    console.log('🔍 Checking for users...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1)
    
    if (usersError) {
      console.log('❌ Cannot access users table:', usersError.message)
      return
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ No users found in database')
      console.log('🔍 You need to create a user first to test task creation')
      console.log('')
      console.log('📋 To create a user:')
      console.log('   1. Go to your app and register/sign up')
      console.log('   2. Or run the admin setup script')
      console.log('   3. Or manually insert a user in Supabase dashboard')
      return
    }
    
    const testUser = users[0]
    console.log('✅ Found user:', testUser.email, 'with role:', testUser.role)
    
    // Step 3: Test task creation with minimal data (no user_role field)
    console.log('🧪 Testing task creation with minimal data...')
    
    const minimalTask = {
      title: 'Test Task - No User Role',
      description: 'Testing task creation without user_role field',
      priority: 'Low',
      status: 'Todo',
      created_by: testUser.id,
      department: 'Testing'
    }
    
    console.log('📤 Sending task data:', minimalTask)
    console.log('🔍 Note: NO user_role field included')
    
    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert([minimalTask])
      .select()
      .single()
    
    if (insertError) {
      console.log('❌ Task creation still failing:', insertError.message)
      
      if (insertError.message.includes('user_role')) {
        console.log('🎯 The user_role field is still being added somewhere!')
        console.log('🔍 Check your application code for where this field is being injected')
        console.log('')
        console.log('🚨 POSSIBLE SOURCES:')
        console.log('   1. Task creation form component')
        console.log('   2. Task context/hooks')
        console.log('   3. Database middleware or functions')
        console.log('   4. Supabase RLS policies or triggers')
      } else {
        console.log('🔍 Different error - not related to user_role')
      }
    } else {
      console.log('🎉 SUCCESS! Task creation is now working!')
      console.log('✅ New task created:', newTask)
      console.log('🔍 Task data received:', Object.keys(newTask))
      
      // Clean up
      await supabase.from('tasks').delete().eq('id', newTask.id)
      console.log('🧹 Test task cleaned up')
      
      console.log('')
      console.log('🎯 ISSUE RESOLVED!')
      console.log('   The user_role field was being added to your task data')
      console.log('   I removed it from the TypeScript interfaces')
      console.log('   Task creation should now work in your application')
      console.log('')
      console.log('📋 Next steps:')
      console.log('   1. Test task creation in your app')
      console.log('   2. If you want user_role tracking, add the column to your database')
      console.log('   3. Then you can add the field back to the interfaces')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testTaskCreation() 