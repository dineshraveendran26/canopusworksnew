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

async function setUserPassword() {
  console.log('🔐 Setting Password for: rrezsoft@gmail.com')
  console.log('=' .repeat(50))

  try {
    // Set the password for the user
    console.log('\n1️⃣ Setting user password...')
    const { data, error } = await adminSupabase.auth.admin.updateUserById(
      '575c027f-2cda-4e65-a688-cc5e358f5e5d', // User ID from previous check
      { password: 'testpassword123' }
    )

    if (error) {
      console.log('❌ Failed to set password:', error.message)
      return
    }

    console.log('✅ Password set successfully')
    console.log('👤 User updated:', {
      id: data.user.id,
      email: data.user.email,
      email_confirmed_at: data.user.email_confirmed_at
    })

    console.log('\n' + '=' .repeat(50))
    console.log('🎯 Password Setup Complete!')
    console.log('🔐 Password: testpassword123')
    console.log('✅ User can now sign in')
    console.log('\n💡 Ready to test viewer permissions')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the script
setUserPassword()
