#!/usr/bin/env node

/**
 * Script to create admin user account
 * Run this with: node scripts/create-admin-user.js
 */

import { createClient } from '@supabase/supabase-js'
import readline from 'readline'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease check your .env.local file')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

async function createAdminUser() {
  console.log('🔐 Admin User Creation Script')
  console.log('=============================\n')

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase.auth.admin.listUsers()
    
    if (checkError) {
      console.error('❌ Error checking existing users:', checkError.message)
      return
    }

    const adminUser = existingUser.users.find(u => u.email === 'dineshraveendran26@gmail.com')
    
    if (adminUser) {
      console.log('✅ Admin user already exists in Supabase Auth')
      console.log(`   Email: ${adminUser.email}`)
      console.log(`   ID: ${adminUser.id}`)
      console.log(`   Created: ${adminUser.created_at}`)
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'dineshraveendran26@gmail.com')
        .single()
      
      if (profileError) {
        console.log('⚠️  Profile not found in users table, creating...')
        await createUserProfile(adminUser.id)
      } else {
        console.log('✅ User profile exists in database')
        console.log(`   Role: ${profile.role}`)
        console.log(`   Approval Status: ${profile.approval_status}`)
      }
      
      rl.close()
      return
    }

    // Get password from user
    const password = await question('Enter password for admin user: ')
    const confirmPassword = await question('Confirm password: ')
    
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match')
      rl.close()
      return
    }

    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters long')
      rl.close()
      return
    }

    console.log('\n🔄 Creating admin user...')

    // Create user in Supabase Auth
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: 'dineshraveendran26@gmail.com',
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Dinesh Raveendran',
        initials: 'DR',
        role: 'administrator',
        department: 'Management'
      }
    })

    if (createError) {
      console.error('❌ Error creating user:', createError.message)
      return
    }

    console.log('✅ Admin user created successfully in Supabase Auth')
    console.log(`   ID: ${user.user.id}`)
    console.log(`   Email: ${user.user.email}`)

    // Create user profile in database
    await createUserProfile(user.user.id)

    console.log('\n🎉 Admin user setup complete!')
    console.log('You can now sign in with:')
    console.log('   Email: dineshraveendran26@gmail.com')
    console.log('   Password: [the password you entered]')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  } finally {
    rl.close()
  }
}

async function createUserProfile(userId) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
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
        approved_by: null,
        approved_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError.message)
      return
    }

    console.log('✅ User profile created in database')
    console.log(`   Role: ${profile.role}`)
    console.log(`   Approval Status: ${profile.approval_status}`)

  } catch (error) {
    console.error('❌ Error in createUserProfile:', error.message)
  }
}

// Run the script
createAdminUser().catch(console.error) 