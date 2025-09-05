const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

async function debugUsersTable() {
  console.log('🔍 Debugging Users Table')
  console.log('=' .repeat(50))

  try {
    // List all users in public.users
    console.log('\n1️⃣ All users in public.users:')
    const { data: allUsers, error: allUsersError } = await adminSupabase
      .from('users')
      .select('*')

    if (allUsersError) {
      console.log('❌ Failed to query users:', allUsersError.message)
      return
    }

    console.log('✅ Found', allUsers.length, 'users in public.users')
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.id}) - Role: ${user.role}`)
    })

    // Check for our specific user
    console.log('\n2️⃣ Looking for rrezsoft@gmail.com:')
    const targetUser = allUsers.find(user => user.email === 'rrezsoft@gmail.com')
    
    if (targetUser) {
      console.log('✅ Found user:', {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        is_active: targetUser.is_active
      })
    } else {
      console.log('❌ User not found in public.users')
      
      // Try to create the user again
      console.log('\n3️⃣ Creating user profile...')
      const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers()
      
      if (authError) {
        console.log('❌ Failed to get auth users:', authError.message)
        return
      }

      const authUser = authUsers.users.find(user => user.email === 'rrezsoft@gmail.com')
      
      if (authUser) {
        const userProfile = {
          id: authUser.id,
          email: authUser.email,
          first_name: 'RR',
          last_name: 'Ez Soft',
          full_name: 'RR Ez Soft',
          role: 'viewer',
          is_active: true,
          department: 'Engineering',
          title: 'Software Engineer',
          phone: '123456789'
        }

        const { data: insertData, error: insertError } = await adminSupabase
          .from('users')
          .insert(userProfile)
          .select()

        if (insertError) {
          console.log('❌ Failed to create user profile:', insertError.message)
        } else {
          console.log('✅ User profile created:', insertData[0])
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the debug
debugUsersTable()
