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

async function fixUserRoleIssue() {
  try {
    console.log('🔧 Fixing user_role issue...')
    
    // Step 1: Check current database structure
    console.log('🔍 Checking current database structure...')
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('tasks')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('❌ Error checking table structure:', tableError)
      return
    }
    
    console.log('✅ Tasks table accessible')
    
    // Step 2: Check if user_role column exists
    console.log('🔍 Checking if user_role column exists...')
    
    try {
      const { data: testQuery, error: testError } = await supabase
        .from('tasks')
        .select('user_role')
        .limit(1)
      
      if (testError && testError.message.includes('column "user_role" does not exist')) {
        console.log('❌ user_role column does not exist - will create it')
        const columnExists = false
      } else {
        console.log('✅ user_role column already exists')
        const columnExists = true
      }
    } catch (error) {
      console.log('❌ user_role column does not exist - will create it')
      const columnExists = false
    }
    
    // Step 3: Add user_role column to tasks table
    console.log('🔧 Adding user_role column to tasks table...')
    
    try {
      // Try to add the column using raw SQL
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_role user_role'
      })
      
      if (alterError) {
        console.log('⚠️ Could not use exec_sql, trying alternative approach...')
        
        // Alternative: Try to insert a task with user_role to see if it works
        const { data: users } = await supabase
          .from('users')
          .select('id, role')
          .limit(1)
        
        if (users && users.length > 0) {
          const testTask = {
            title: 'Test Task - Role Fix',
            description: 'Testing if user_role field works',
            priority: 'Low',
            status: 'Todo',
            created_by: users[0].id,
            department: 'Testing'
          }
          
          const { data: newTask, error: insertError } = await supabase
            .from('tasks')
            .insert([testTask])
            .select()
            .single()
          
          if (insertError) {
            console.log('❌ Task creation still failing:', insertError.message)
            
            // Check if it's the user_role enum issue
            if (insertError.message.includes('user_role') && insertError.message.includes('Administrator')) {
              console.log('🎯 Found the exact issue! user_role field is being added somewhere...')
              
              // Let's check what's actually being sent
              console.log('🔍 Checking what fields are being sent...')
              
              // Try to create a task without any extra fields
              const minimalTask = {
                title: 'Minimal Test Task',
                description: 'Testing minimal fields',
                priority: 'Low',
                status: 'Todo',
                created_by: users[0].id
              }
              
              console.log('📤 Sending minimal task data:', minimalTask)
              
              const { data: minimalResult, error: minimalError } = await supabase
                .from('tasks')
                .insert([minimalTask])
                .select()
                .single()
              
              if (minimalError) {
                console.log('❌ Even minimal task creation failed:', minimalError.message)
              } else {
                console.log('✅ Minimal task creation succeeded!')
                console.log('🎯 The issue is that extra fields are being added somewhere in your code')
                
                // Clean up
                await supabase.from('tasks').delete().eq('id', minimalResult.id)
              }
            }
          } else {
            console.log('✅ Task creation succeeded! user_role field is working')
            console.log('New task:', newTask)
            
            // Clean up
            await supabase.from('tasks').delete().eq('id', newTask.id)
          }
        }
      } else {
        console.log('✅ user_role column added successfully')
      }
    } catch (error) {
      console.log('⚠️ Error adding column:', error.message)
    }
    
    // Step 4: Check current users and their roles
    console.log('👥 Checking current users...')
    
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
    
    // Step 5: Ensure all users have administrator rights
    console.log('🔧 Ensuring all users have administrator rights...')
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'administrator',
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .neq('role', 'administrator')
    
    if (updateError) {
      console.log('⚠️ Could not update user roles:', updateError.message)
    } else {
      console.log('✅ User roles updated to administrator')
    }
    
    // Step 6: Test task creation again
    console.log('🧪 Testing task creation after fixes...')
    
    if (users && users.length > 0) {
      const testUser = users[0]
      
      const testTask = {
        title: 'Final Test Task',
        description: 'Testing task creation after all fixes',
        priority: 'Low',
        status: 'Todo',
        created_by: testUser.id,
        department: testUser.department || 'Testing'
      }
      
      console.log('📤 Sending test task:', testTask)
      
      const { data: finalTask, error: finalError } = await supabase
        .from('tasks')
        .insert([testTask])
        .select()
        .single()
      
      if (finalError) {
        console.error('❌ Final task creation test failed:', finalError)
        console.log('🔍 Error details:', finalError.message)
        
        // Check if it's still the user_role issue
        if (finalError.message.includes('user_role')) {
          console.log('🎯 The user_role field is still being added somewhere!')
          console.log('🔍 You need to find where in your code this field is being added to task data')
        }
      } else {
        console.log('🎉 SUCCESS! Task creation is now working!')
        console.log('✅ New task created:', finalTask)
        
        // Clean up
        await supabase.from('tasks').delete().eq('id', finalTask.id)
        console.log('🧹 Test task cleaned up')
      }
    }
    
    console.log('')
    console.log('📋 Summary:')
    console.log('  ✅ Database connection working')
    console.log('  ✅ Users table accessible')
    console.log('  ✅ Tasks table accessible')
    
    if (finalError) {
      console.log('  ❌ Task creation still failing - user_role field being added somewhere')
      console.log('  🔍 Check your application code for where user_role is being added to tasks')
    } else {
      console.log('  ✅ Task creation working - issue resolved!')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixUserRoleIssue() 