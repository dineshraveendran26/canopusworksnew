const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupAdminUser() {
  try {
    console.log('Setting up admin user...')
    
    // Create the admin user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'dineshraveendran26@gmail.com',
      password: 'Welcome123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Dinesh Raveendran',
        initials: 'DR',
        role: 'administrator',
        department: 'Management'
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('Admin user already exists in auth.users')
      } else {
        throw authError
      }
    } else {
      console.log('Admin user created in auth.users:', authData.user.id)
    }

    // Get the user ID (either from creation or existing)
    let userId
    if (authData?.user?.id) {
      userId = authData.user.id
    } else {
      const { data: existingUser } = await supabase.auth.admin.listUsers()
      const adminUser = existingUser.users.find(u => u.email === 'dineshraveendran26@gmail.com')
      if (adminUser) {
        userId = adminUser.id
      } else {
        throw new Error('Could not find admin user')
      }
    }

    // Create/update user profile in public.users
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: 'dineshraveendran26@gmail.com',
        full_name: 'Dinesh Raveendran',
        initials: 'DR',
        role: 'administrator',
        department: 'Management',
        phone: null,
        location: null,
        join_date: new Date().toISOString().split('T')[0],
        status: 'active',
        avatar_url: null,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      throw profileError
    }

    console.log('✅ Admin user setup complete!')
    console.log('Email: dineshraveendran26@gmail.com')
    console.log('Password: Welcome123')
    console.log('Role: Administrator')
    
  } catch (error) {
    console.error('Error setting up admin user:', error)
    process.exit(1)
  }
}

setupAdminUser() 