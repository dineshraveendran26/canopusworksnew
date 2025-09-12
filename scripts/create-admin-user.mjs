#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import readline from 'readline'
import dotenv from 'dotenv'
import fs from 'fs'

// Load env
const envPath = '.env.local'
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((res) => rl.question(q, res))

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function ensureProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()
  if (!error && data) return
  await supabase.from('users').insert({
    id: userId,
    email: 'dineshraveendran26@gmail.com',
    full_name: 'Dinesh Raveendran',
    initials: 'DR',
    role: 'administrator',
    department: 'Management',
    join_date: new Date().toISOString().split('T')[0],
    status: 'active',
    approval_status: 'approved',
    approved_at: new Date().toISOString(),
  })
}

async function run() {
  console.log('Creating admin user: dineshraveendran26@gmail.com')
  // Check existing
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('Auth admin error:', listErr.message)
    process.exit(1)
  }
  const existing = list.users.find((u) => u.email === 'dineshraveendran26@gmail.com')
  if (existing) {
    console.log('Admin user already exists:', existing.id)
    await ensureProfile(existing.id)
    rl.close()
    return
  }
  let pwd = process.env.ADMIN_PASSWORD
  if (!pwd) {
    pwd = await ask('Enter a password for the admin user: ')
  }
  if (!pwd || pwd.length < 6) {
    console.error('Password must be at least 6 characters.')
    rl.close()
    process.exit(1)
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'dineshraveendran26@gmail.com',
    password: pwd,
    email_confirm: true,
    user_metadata: {
      full_name: 'Dinesh Raveendran',
      initials: 'DR',
      role: 'administrator',
      department: 'Management',
    },
  })
  if (error) {
    console.error('Create user error:', error.message)
    rl.close()
    process.exit(1)
  }
  console.log('Created:', data.user.id)
  await ensureProfile(data.user.id)
  console.log('Profile ensured and approved.')
  rl.close()
}

run().catch((e) => {
  console.error(e)
  rl.close()
  process.exit(1)
}) 