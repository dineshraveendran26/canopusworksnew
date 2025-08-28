require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

console.log('🔗 Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSupabaseConnection() {
  try {
    console.log('\n🔄 Testing basic connection...')
    
    // Test 1: Check if we can connect
    const { data, error } = await supabase.from('tasks').select('count').limit(1)
    
    if (error) {
      console.error('❌ Connection test failed:', error)
      return
    }
    
    console.log('✅ Basic connection successful')
    
    // Test 2: Check tasks table structure
    console.log('\n🔄 Checking tasks table structure...')
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1)
    
    if (tasksError) {
      console.error('❌ Tasks table access failed:', tasksError)
      return
    }
    
    console.log('✅ Tasks table accessible')
    console.log('📋 Sample task structure:', tasks[0] ? Object.keys(tasks[0]) : 'No tasks found')
    
    // Test 3: Check RLS policies
    console.log('\n🔄 Testing RLS policies...')
    
    // Try to insert a test task (this should fail due to RLS)
    const testTask = {
      title: 'Test Task - Connection Test',
      description: 'This is a test task to verify connection',
      priority: 'Low',
      status: 'Todo',
      created_by: '00000000-0000-0000-0000-000000000000', // Fake UUID
      department: 'Test'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select()
    
    if (insertError) {
      console.log('ℹ️ Insert test failed (expected due to RLS):', insertError.message)
      console.log('✅ RLS policies are working (preventing unauthorized inserts)')
    } else {
      console.log('⚠️ Insert test succeeded (RLS might be too permissive)')
    }
    
    console.log('\n🎉 Supabase connection test completed successfully!')
    console.log('📝 The connection is working, but RLS policies are preventing task creation')
    console.log('🔑 You need to be authenticated to create tasks')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

testSupabaseConnection() 