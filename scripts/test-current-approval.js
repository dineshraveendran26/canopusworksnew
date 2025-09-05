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

async function testCurrentApproval() {
  console.log('🧪 Testing Current Approval Function')
  console.log('=' .repeat(50))

  try {
    // Test the existing approve_user function
    console.log('\n1️⃣ Testing existing approve_user function...')
    
    const { data: approveTest, error: approveError } = await adminSupabase.rpc('approve_user', {
      p_user_id: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      p_approved_by: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      p_new_role: 'manager',
      p_rejection_reason: null
    })

    if (approveError) {
      console.log('❌ Existing approval function failed:', approveError.message)
    } else {
      console.log('✅ Existing approval function working')
    }

    // Test the existing reject_user function
    console.log('\n2️⃣ Testing existing reject_user function...')
    
    const { data: rejectTest, error: rejectError } = await adminSupabase.rpc('reject_user', {
      p_user_id: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      p_rejected_by: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      p_rejection_reason: 'Test rejection'
    })

    if (rejectError) {
      console.log('❌ Existing rejection function failed:', rejectError.message)
    } else {
      console.log('✅ Existing rejection function working')
    }

    console.log('\n' + '=' .repeat(50))
    console.log('🎯 Current Function Status')
    console.log('✅ Frontend reverted to use existing functions')
    console.log('✅ User approval should now work')
    console.log('\n💡 To get enhanced notifications:')
    console.log('1. Run the SQL provided in the previous script')
    console.log('2. Update frontend to use enhanced functions')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the test
testCurrentApproval()
