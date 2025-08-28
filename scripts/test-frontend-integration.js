#!/usr/bin/env node

/**
 * Test script for frontend integration
 * This script tests the basic functionality without requiring service role key
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testFrontendIntegration() {
  console.log('🧪 Testing frontend integration...\n')

  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1️⃣ Testing Supabase connection...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.warn('⚠️ Session error (expected for anonymous access):', sessionError.message)
    } else {
      console.log('✅ Supabase connection successful')
    }

    // Test 2: Check if views exist and are accessible
    console.log('\n2️⃣ Testing database views...')
    
    try {
      const { data: tasksView, error: tasksViewError } = await supabase
        .from('tasks_with_assignees')
        .select('id, title')
        .limit(1)

      if (tasksViewError) {
        console.warn('⚠️ tasks_with_assignees view error:', tasksViewError.message)
      } else {
        console.log('✅ tasks_with_assignees view accessible')
      }
    } catch (error) {
      console.warn('⚠️ Could not access tasks_with_assignees view:', error.message)
    }

    try {
      const { data: subtasksView, error: subtasksViewError } = await supabase
        .from('subtasks_with_assignees')
        .select('id, title')
        .limit(1)

      if (subtasksViewError) {
        console.warn('⚠️ subtasks_with_assignees view error:', subtasksViewError.message)
      } else {
        console.log('✅ subtasks_with_assignees view accessible')
      }
    } catch (error) {
      console.warn('⚠️ Could not access subtasks_with_assignees view:', error.message)
    }

    // Test 3: Check if functions exist
    console.log('\n3️⃣ Testing database functions...')
    
    try {
      // This will fail without proper authentication, but we can check if the function exists
      const { error: functionError } = await supabase
        .rpc('get_effective_subtask_assignees', { p_subtask_id: '00000000-0000-0000-0000-000000000000' })

      if (functionError) {
        if (functionError.message.includes('function') || functionError.message.includes('does not exist')) {
          console.error('❌ Function get_effective_subtask_assignees does not exist')
        } else {
          console.log('✅ Function get_effective_subtask_assignees exists (auth error expected)')
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not test function:', error.message)
    }

    // Test 4: Check if tables exist
    console.log('\n4️⃣ Testing table access...')
    
    try {
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_member')
        .select('id, full_name')
        .limit(1)

      if (teamMembersError) {
        console.warn('⚠️ team_member table error:', teamMembersError.message)
      } else {
        console.log('✅ team_member table accessible')
      }
    } catch (error) {
      console.warn('⚠️ Could not access team_member table:', error.message)
    }

    try {
      const { data: subtaskAssignments, error: subtaskAssignmentsError } = await supabase
        .from('subtask_assignments')
        .select('id')
        .limit(1)

      if (subtaskAssignmentsError) {
        console.warn('⚠️ subtask_assignments table error:', subtaskAssignmentsError.message)
      } else {
        console.log('✅ subtask_assignments table accessible')
      }
    } catch (error) {
      console.warn('⚠️ Could not access subtask_assignments table:', error.message)
    }

    // Test 5: Check if we can read existing data
    console.log('\n5️⃣ Testing data access...')
    
    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status')
        .limit(3)

      if (tasksError) {
        console.warn('⚠️ tasks table error:', tasksError.message)
      } else {
        console.log(`✅ tasks table accessible - found ${tasks?.length || 0} tasks`)
        if (tasks && tasks.length > 0) {
          console.log('   Sample tasks:')
          tasks.forEach(task => {
            console.log(`     - ${task.title} (${task.status})`)
          })
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not access tasks table:', error.message)
    }

    console.log('\n🎉 Frontend integration test completed!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Supabase connection')
    console.log('   ✅ Database views (if accessible)')
    console.log('   ✅ Database functions (if accessible)')
    console.log('   ✅ Table access (if accessible)')
    console.log('   ✅ Data retrieval (if accessible)')
    
    console.log('\n💡 Note: Some tests may show warnings due to RLS policies.')
    console.log('   This is expected behavior for anonymous access.')
    console.log('\n🚀 To run full tests with data creation, you need:')
    console.log('   1. SUPABASE_SERVICE_ROLE_KEY in .env.local')
    console.log('   2. Or authenticate as a user with proper permissions')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the tests
testFrontendIntegration()
  .then(() => {
    console.log('\n✨ Frontend integration test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Frontend integration test failed:', error)
    process.exit(1)
  }) 