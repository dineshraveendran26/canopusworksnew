const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const adminSupabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null

async function checkUserStatus() {
  console.log('🔍 Checking User Status for: rrezsoft@gmail.com')
  console.log('=' .repeat(50))

  try {
    // Check if user exists in auth.users (using admin client)
    console.log('\n1️⃣ Checking Auth Users...')
    if (!adminSupabase) {
      console.log('⚠️ No service role key available, skipping auth.users check')
    } else {
      const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers()
      
      if (authError) {
        console.log('❌ Failed to list auth users:', authError.message)
      } else {
        const targetUser = authUsers.users.find(user => user.email === 'rrezsoft@gmail.com')
        
        if (targetUser) {
          console.log('✅ User found in auth.users')
          console.log('👤 User ID:', targetUser.id)
          console.log('📧 Email:', targetUser.email)
          console.log('✅ Email Confirmed:', targetUser.email_confirmed_at ? 'Yes' : 'No')
          console.log('🔐 Last Sign In:', targetUser.last_sign_in_at)
          console.log('📅 Created:', targetUser.created_at)
        } else {
          console.log('❌ User not found in auth.users')
        }
      }
    }

    // Check if user exists in public.users
    console.log('\n2️⃣ Checking Public Users...')
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'rrezsoft@gmail.com')

    if (publicError) {
      console.log('❌ Failed to query public.users:', publicError.message)
      return
    }

    if (publicUsers && publicUsers.length > 0) {
      const user = publicUsers[0]
      console.log('✅ User found in public.users')
      console.log('👤 User ID:', user.id)
      console.log('📧 Email:', user.email)
      console.log('👤 Full Name:', user.full_name)
      console.log('🔑 Role:', user.role)
      console.log('✅ Active:', user.is_active)
      console.log('📅 Created:', user.created_at)
      console.log('📅 Updated:', user.updated_at)
    } else {
      console.log('❌ User not found in public.users')
    }

    // Check notifications for this user
    console.log('\n3️⃣ Checking Notifications...')
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${publicUsers?.[0]?.id || 'null'},metadata->>'pending_user_id'.eq.${publicUsers?.[0]?.id || 'null'}`)

    if (notifError) {
      console.log('❌ Failed to query notifications:', notifError.message)
    } else {
      console.log('✅ Notifications query successful')
      console.log('📋 Number of notifications:', notifications.length)
      if (notifications.length > 0) {
        notifications.forEach((notif, index) => {
          console.log(`📝 Notification ${index + 1}:`, {
            type: notif.type,
            title: notif.title,
            is_read: notif.is_read,
            created_at: notif.created_at
          })
        })
      }
    }

    console.log('\n' + '=' .repeat(50))
    console.log('📊 Summary:')
    
    if (publicUsers && publicUsers.length > 0) {
      const user = publicUsers[0]
      console.log('✅ User exists in public.users table')
      console.log('🔑 Current Role:', user.role)
      console.log('✅ Account Active:', user.is_active)
      
      if (!user.is_active) {
        console.log('⚠️ User account is not active - needs admin approval')
        console.log('💡 An administrator needs to approve this user')
      }
      
      if (user.role !== 'viewer') {
        console.log('⚠️ User role is not "viewer" - current role:', user.role)
      }
    } else {
      console.log('❌ User not found in public.users table')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the check
checkUserStatus()
