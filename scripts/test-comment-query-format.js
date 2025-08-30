#!/usr/bin/env node

// Test script to check comment query format
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCommentQueryFormat() {
  try {
    console.log('🧪 Testing Comment Query Format...\n')

    // Test the exact query format used in the frontend
    console.log('1️⃣ Testing task comments query...')
    const { data: taskComments, error: taskError } = await supabase
      .from('comments')
      .select(`
        *,
        users!comments_author_id_fkey(id, email, full_name)
      `)
      .eq('task_id', '100ad7c1-88a9-4760-8cc6-5e2ad5baf2f6')
      .is('subtask_id', null)
      .order('created_at', { ascending: false })

    if (taskError) {
      console.log('❌ Query error:', taskError)
      return
    }

    console.log('✅ Query successful!')
    console.log('📊 Number of comments:', taskComments?.length || 0)
    
    if (taskComments && taskComments.length > 0) {
      console.log('\n🔍 First comment structure:')
      console.log(JSON.stringify(taskComments[0], null, 2))
      
      console.log('\n🔍 Users object:')
      console.log('users:', taskComments[0].users)
      console.log('typeof users:', typeof taskComments[0].users)
      
      if (taskComments[0].users) {
        console.log('users.full_name:', taskComments[0].users.full_name)
        console.log('users.email:', taskComments[0].users.email)
      }
    }

    // Test alternative query format
    console.log('\n2️⃣ Testing alternative query format...')
    const { data: altComments, error: altError } = await supabase
      .from('comments')
      .select(`
        id,
        task_id,
        subtask_id,
        author_id,
        content,
        is_internal,
        created_at,
        updated_at,
        users:author_id (
          id,
          email,
          full_name
        )
      `)
      .eq('task_id', '100ad7c1-88a9-4760-8cc6-5e2ad5baf2f6')
      .is('subtask_id', null)

    if (altError) {
      console.log('❌ Alternative query error:', altError)
    } else {
      console.log('✅ Alternative query successful!')
      console.log('📊 Number of comments:', altComments?.length || 0)
      
      if (altComments && altComments.length > 0) {
        console.log('\n🔍 Alternative format structure:')
        console.log(JSON.stringify(altComments[0], null, 2))
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

testCommentQueryFormat() 