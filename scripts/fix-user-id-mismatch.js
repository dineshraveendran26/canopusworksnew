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

async function fixUserIdMismatch() {
  console.log('🔧 Fixing User ID Mismatch for: rrezsoft@gmail.com')
  console.log('=' .repeat(50))

  try {
    // Get the auth user ID
    console.log('\n1️⃣ Getting auth user ID...')
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Failed to get auth users:', authError.message)
      return
    }

    const authUser = authUsers.users.find(user => user.email === 'rrezsoft@gmail.com')
    
    if (!authUser) {
      console.log('❌ User not found in auth.users')
      return
    }

    console.log('✅ Auth user found')
    console.log('🔐 Auth User ID:', authUser.id)

    // Get the public user
    console.log('\n2️⃣ Getting public user...')
    const { data: publicUsers, error: publicError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', 'rrezsoft@gmail.com')

    if (publicError) {
      console.log('❌ Failed to get public user:', publicError.message)
      return
    }

    if (!publicUsers || publicUsers.length === 0) {
      console.log('❌ User not found in public.users')
      return
    }

    const publicUser = publicUsers[0]
    console.log('✅ Public user found')
    console.log('👤 Public User ID:', publicUser.id)

    if (authUser.id === publicUser.id) {
      console.log('✅ User IDs match - no fix needed')
      return
    }

    // Delete the old public user and create a new one with correct ID
    console.log('\n3️⃣ Fixing user ID mismatch...')
    
    // Delete old user
    const { error: deleteError } = await adminSupabase
      .from('users')
      .delete()
      .eq('id', publicUser.id)

    if (deleteError) {
      console.log('❌ Failed to delete old user:', deleteError.message)
      return
    }

    console.log('✅ Old user deleted')

    // Create new user with correct ID
    const newUserProfile = {
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
      .insert(newUserProfile)
      .select()

    if (insertError) {
      console.log('❌ Failed to create new user profile:', insertError.message)
      return
    }

    console.log('✅ New user profile created with correct ID')
    console.log('👤 New user:', insertData[0])

    // Update the user role to viewer
    console.log('\n4️⃣ Updating user role to viewer...')
    const { data: updateData, error: updateError } = await adminSupabase
      .from('users')
      .update({ role: 'viewer' })
      .eq('id', authUser.id)
      .select()

    if (updateError) {
      console.log('❌ Failed to update user role:', updateError.message)
    } else {
      console.log('✅ User role updated to viewer')
      console.log('👤 Updated user:', updateData[0])
    }

    console.log('\n' + '=' .repeat(50))
    console.log('🎯 User ID Fix Complete!')
    console.log('✅ Auth and public user IDs now match')
    console.log('🔑 Role: viewer')
    console.log('✅ Active: true')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the fix
fixUserIdMismatch()
