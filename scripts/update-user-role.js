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

async function updateUserRole() {
  console.log('🔧 Updating User Role to Viewer')
  console.log('=' .repeat(50))

  try {
    // Update the user role to viewer
    console.log('\n1️⃣ Updating user role to viewer...')
    const { data: updateData, error: updateError } = await adminSupabase
      .from('users')
      .update({ role: 'viewer' })
      .eq('email', 'rrezsoft@gmail.com')
      .select()

    if (updateError) {
      console.log('❌ Failed to update user role:', updateError.message)
      return
    }

    console.log('✅ User role updated successfully')
    console.log('👤 Updated user:', updateData[0])

    // Verify the update
    console.log('\n2️⃣ Verifying the update...')
    const { data: verifyData, error: verifyError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('email', 'rrezsoft@gmail.com')
      .single()

    if (verifyError) {
      console.log('❌ Failed to verify user:', verifyError.message)
    } else {
      console.log('✅ User verified')
      console.log('👤 User details:', {
        id: verifyData.id,
        email: verifyData.email,
        role: verifyData.role,
        is_active: verifyData.is_active
      })
    }

    console.log('\n' + '=' .repeat(50))
    console.log('🎯 User Role Update Complete!')
    console.log('🔑 Role: viewer')
    console.log('✅ Active: true')
    console.log('\n💡 Ready to test viewer permissions')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the update
updateUserRole()
