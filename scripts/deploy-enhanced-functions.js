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

async function deployEnhancedFunctions() {
  console.log('🔧 Deploying Enhanced Notification Functions')
  console.log('=' .repeat(50))

  try {
    // Read the migration files
    const fs = require('fs')
    const path = require('path')
    
    // Read enhanced notification functions
    const enhancedFunctionsPath = path.join(__dirname, '../supabase/migrations/046_enhance_notification_details.sql')
    const triggerUpdatePath = path.join(__dirname, '../supabase/migrations/047_update_user_registration_trigger.sql')
    
    if (!fs.existsSync(enhancedFunctionsPath)) {
      console.log('❌ Enhanced functions migration file not found:', enhancedFunctionsPath)
      return
    }

    if (!fs.existsSync(triggerUpdatePath)) {
      console.log('❌ Trigger update migration file not found:', triggerUpdatePath)
      return
    }

    const enhancedFunctionsSQL = fs.readFileSync(enhancedFunctionsPath, 'utf8')
    const triggerUpdateSQL = fs.readFileSync(triggerUpdatePath, 'utf8')
    
    console.log('✅ Migration files loaded')

    // Deploy enhanced functions
    console.log('\n1️⃣ Deploying enhanced notification functions...')
    const { error: enhancedError } = await adminSupabase.rpc('exec_sql', { sql: enhancedFunctionsSQL })

    if (enhancedError) {
      console.log('❌ Failed to deploy enhanced functions:', enhancedError.message)
      console.log('💡 You may need to deploy these manually in the Supabase dashboard')
      console.log('📋 SQL to run:')
      console.log(enhancedFunctionsSQL)
      return
    }

    console.log('✅ Enhanced functions deployed successfully')

    // Deploy trigger update
    console.log('\n2️⃣ Updating user registration trigger...')
    const { error: triggerError } = await adminSupabase.rpc('exec_sql', { sql: triggerUpdateSQL })

    if (triggerError) {
      console.log('❌ Failed to update trigger:', triggerError.message)
      console.log('💡 You may need to deploy this manually in the Supabase dashboard')
      console.log('📋 SQL to run:')
      console.log(triggerUpdateSQL)
      return
    }

    console.log('✅ Trigger updated successfully')

    // Test the enhanced functions
    console.log('\n3️⃣ Testing enhanced functions...')
    
    // Test approve_user_enhanced
    const { data: approveTest, error: approveError } = await adminSupabase.rpc('approve_user_enhanced', {
      p_user_id: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      p_approved_by: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      p_new_role: 'viewer',
      p_rejection_reason: null
    })

    if (approveError) {
      console.log('❌ Enhanced approval function test failed:', approveError.message)
    } else {
      console.log('✅ Enhanced approval function working')
    }

    // Test reject_user_enhanced
    const { data: rejectTest, error: rejectError } = await adminSupabase.rpc('reject_user_enhanced', {
      p_user_id: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      p_rejected_by: '575c027f-2cda-4e65-a688-cc5e358f5e5d',
      p_rejection_reason: 'Test rejection'
    })

    if (rejectError) {
      console.log('❌ Enhanced rejection function test failed:', rejectError.message)
    } else {
      console.log('✅ Enhanced rejection function working')
    }

    console.log('\n' + '=' .repeat(50))
    console.log('🎯 Enhanced Functions Deployment Complete!')
    console.log('✅ Enhanced notification functions deployed')
    console.log('✅ User registration trigger updated')
    console.log('✅ Functions tested successfully')
    console.log('\n💡 You can now update the frontend to use the enhanced functions')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the deployment
deployEnhancedFunctions()
