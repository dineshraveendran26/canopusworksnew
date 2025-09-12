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

async function createUserProfile() {
  console.log('🔧 Creating User Profile for: rrezsoft@gmail.com')
  console.log('=' .repeat(50))

  try {
    // Get the user from auth.users
    console.log('\n1️⃣ Getting user from auth.users...')
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Failed to list auth users:', authError.message)
      return
    }

    const targetUser = authUsers.users.find(user => user.email === 'rrezsoft@gmail.com')
    
    if (!targetUser) {
      console.log('❌ User not found in auth.users')
      return
    }

    console.log('✅ User found in auth.users')
    console.log('👤 User ID:', targetUser.id)
    console.log('📧 Email:', targetUser.email)

    // Check if user already exists in public.users
    console.log('\n2️⃣ Checking if user already exists in public.users...')
    const { data: existingUser, error: checkError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', targetUser.email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Error checking existing user:', checkError.message)
      return
    }

    if (existingUser) {
      console.log('✅ User already exists in public.users, updating...')
      const updateData = {
        first_name: 'RR',
        last_name: 'Ez Soft',
        full_name: 'RR Ez Soft',
        role: 'viewer',
        is_active: true,
        department: 'Engineering',
        title: 'Software Engineer',
        phone: '123456789',
        updated_at: new Date().toISOString()
      }

      const { data: updateResult, error: updateError } = await adminSupabase
        .from('users')
        .update(updateData)
        .eq('id', existingUser.id)
        .select()

      if (updateError) {
        console.log('❌ Failed to update user profile:', updateError.message)
        return
      }

      console.log('✅ User profile updated successfully')
      console.log('👤 Updated user:', updateResult[0])
    } else {
      console.log('✅ Creating new user profile in public.users...')
      const userProfile = {
        id: targetUser.id,
        email: targetUser.email,
        first_name: 'RR',
        last_name: 'Ez Soft',
        full_name: 'RR Ez Soft',
        role: 'viewer',
        is_active: true, // Set to true for testing
        department: 'Engineering',
        title: 'Software Engineer',
        phone: '123456789',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: insertData, error: insertError } = await adminSupabase
        .from('users')
        .insert(userProfile)
        .select()

      if (insertError) {
        console.log('❌ Failed to create user profile:', insertError.message)
        return
      }

      console.log('✅ User profile created successfully')
      console.log('👤 Created user:', insertData[0])
    }

    // Verify the user profile was created
    console.log('\n3️⃣ Verifying user profile...')
    const { data: verifyData, error: verifyError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', 'rrezsoft@gmail.com')
      .single()

    if (verifyError) {
      console.log('❌ Failed to verify user profile:', verifyError.message)
    } else {
      console.log('✅ User profile verified')
      console.log('👤 User details:', {
        id: verifyData.id,
        email: verifyData.email,
        full_name: verifyData.full_name,
        role: verifyData.role,
        is_active: verifyData.is_active
      })
    }

    console.log('\n' + '=' .repeat(50))
    console.log('🎯 User Profile Creation Complete!')
    console.log('✅ User now exists in both auth.users and public.users')
    console.log('🔑 Role: viewer')
    console.log('✅ Active: true')
    console.log('\n💡 You can now test the viewer permissions')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the script
createUserProfile()
