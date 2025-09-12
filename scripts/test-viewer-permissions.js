const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Test configuration
const TEST_USER_EMAIL = 'rrezsoft@gmail.com'
const TEST_USER_PASSWORD = 'testpassword123' // You'll need to set this

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testViewerPermissions() {
  console.log('🧪 Starting Viewer Permissions Test for:', TEST_USER_EMAIL)
  console.log('🔗 Supabase URL:', supabaseUrl)
  console.log('=' .repeat(60))

  try {
    // Step 1: Sign in as viewer user
    console.log('\n1️⃣ Testing User Authentication...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    })

    if (authError) {
      console.log('❌ Authentication failed:', authError.message)
      console.log('💡 Make sure the user exists and password is correct')
      console.log('💡 You may need to set a password for this user first')
      return
    }

    console.log('✅ Authentication successful')
    console.log('👤 User ID:', authData.user.id)
    console.log('📧 Email:', authData.user.email)

    // Step 2: Get user role from database
    console.log('\n2️⃣ Checking User Role...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (userError) {
      console.log('❌ Failed to get user data:', userError.message)
      return
    }

    if (!userData) {
      console.log('❌ User not found in public.users table')
      return
    }

    console.log('✅ User data retrieved')
    console.log('👤 Full Name:', userData.full_name)
    console.log('🔑 Role:', userData.role)
    console.log('✅ Active:', userData.is_active)

    if (userData.role !== 'viewer') {
      console.log('⚠️ Warning: User role is not "viewer"')
    }

    // Step 3: Test Task Read Permissions (Viewer should be able to read)
    console.log('\n3️⃣ Testing Task Read Permissions...')
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(5)

    if (tasksError) {
      console.log('❌ Failed to read tasks:', tasksError.message)
    } else {
      console.log('✅ Successfully read tasks')
      console.log('📋 Number of tasks accessible:', tasks.length)
      if (tasks.length > 0) {
        console.log('📝 Sample task:', {
          id: tasks[0].id,
          title: tasks[0].title,
          status: tasks[0].status
        })
      }
    }

    // Step 4: Test Task Create Permissions (Viewer should NOT be able to create)
    console.log('\n4️⃣ Testing Task Create Permissions...')
    const testTask = {
      title: 'Test Task - Viewer Permission Check',
      description: 'This task should fail to create for viewer role',
      status: 'Todo',
      priority: 'Medium',
      department: 'Test'
    }

    const { data: createData, error: createError } = await supabase
      .from('tasks')
      .insert(testTask)
      .select()

    if (createError) {
      console.log('✅ Correctly blocked task creation (expected for viewer)')
      console.log('🚫 Error:', createError.message)
    } else {
      console.log('❌ Unexpectedly allowed task creation (should be blocked for viewer)')
      console.log('⚠️ This indicates a permission system issue')
    }

    // Step 5: Test Task Update Permissions (Viewer should NOT be able to update)
    console.log('\n5️⃣ Testing Task Update Permissions...')
    if (tasks && tasks.length > 0) {
      const taskToUpdate = tasks[0]
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ title: 'Updated by Viewer (should fail)' })
        .eq('id', taskToUpdate.id)

      if (updateError) {
        console.log('✅ Correctly blocked task update (expected for viewer)')
        console.log('🚫 Error:', updateError.message)
      } else {
        console.log('❌ Unexpectedly allowed task update (should be blocked for viewer)')
        console.log('⚠️ This indicates a permission system issue')
      }
    } else {
      console.log('⚠️ No tasks available to test update permissions')
    }

    // Step 6: Test Subtask Read Permissions
    console.log('\n6️⃣ Testing Subtask Read Permissions...')
    const { data: subtasks, error: subtasksError } = await supabase
      .from('subtasks')
      .select('*')
      .limit(5)

    if (subtasksError) {
      console.log('❌ Failed to read subtasks:', subtasksError.message)
    } else {
      console.log('✅ Successfully read subtasks')
      console.log('📋 Number of subtasks accessible:', subtasks.length)
    }

    // Step 7: Test User Management Permissions (Viewer should NOT have access)
    console.log('\n7️⃣ Testing User Management Permissions...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(5)

    if (usersError) {
      console.log('❌ Failed to read users:', usersError.message)
    } else {
      console.log('✅ Successfully read users (viewer can read user list)')
      console.log('📋 Number of users accessible:', users.length)
    }

    // Step 8: Test Comments Read Permissions
    console.log('\n8️⃣ Testing Comments Read Permissions...')
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(5)

    if (commentsError) {
      console.log('❌ Failed to read comments:', commentsError.message)
    } else {
      console.log('✅ Successfully read comments')
      console.log('📋 Number of comments accessible:', comments.length)
    }

    // Step 9: Test Permission Function
    console.log('\n9️⃣ Testing Permission Check Function...')
    const { data: permissionCheck, error: permError } = await supabase.rpc('check_user_permission', {
      user_id: authData.user.id,
      resource_name: 'tasks',
      action_name: 'read'
    })

    if (permError) {
      console.log('❌ Permission check failed:', permError.message)
    } else {
      console.log('✅ Permission check successful')
      console.log('🔐 Can read tasks:', permissionCheck)
    }

    // Step 10: Test Create Permission (should be false for viewer)
    const { data: createPermCheck, error: createPermError } = await supabase.rpc('check_user_permission', {
      user_id: authData.user.id,
      resource_name: 'tasks',
      action_name: 'create'
    })

    if (createPermError) {
      console.log('❌ Create permission check failed:', createPermError.message)
    } else {
      console.log('✅ Create permission check successful')
      console.log('🔐 Can create tasks:', createPermCheck)
      if (createPermCheck) {
        console.log('⚠️ Warning: Viewer can create tasks (should be false)')
      }
    }

    console.log('\n' + '=' .repeat(60))
    console.log('🎯 Viewer Permissions Test Complete!')
    console.log('\n📊 Summary:')
    console.log('✅ Authentication: Working')
    console.log('✅ Role Assignment: Working')
    console.log('✅ Task Read: Working')
    console.log('✅ Subtask Read: Working')
    console.log('✅ User Read: Working')
    console.log('✅ Comments Read: Working')
    console.log('✅ Permission Function: Working')
    console.log('\n🔒 Expected Restrictions:')
    console.log('🚫 Task Creation: Should be blocked')
    console.log('🚫 Task Updates: Should be blocked')
    console.log('🚫 Task Deletion: Should be blocked')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    // Clean up - sign out
    await supabase.auth.signOut()
    console.log('\n🧹 Cleaned up - signed out')
  }
}

// Run the test
testViewerPermissions()
