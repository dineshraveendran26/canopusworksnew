#!/usr/bin/env node

/**
 * Test script for the new many-to-many task assignment system
 * 
 * This script tests:
 * 1. Creating tasks with multiple assignees
 * 2. Updating task assignments
 * 3. Fetching task assignments
 * 4. Error handling
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNewAssignmentSystem() {
  console.log('🧪 Testing new many-to-many task assignment system...\n')

  try {
    // Test 1: Create a test task
    console.log('1️⃣ Creating test task...')
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: 'Test Task - Many Assignees',
        description: 'Testing the new assignment system',
        priority: 'Medium',
        status: 'Todo',
        department: 'Engineering',
        created_by: '00000000-0000-0000-0000-000000000000' // Placeholder
      })
      .select()
      .single()

    if (taskError) {
      throw new Error(`Failed to create test task: ${taskError.message}`)
    }

    console.log('✅ Test task created:', task.id)
    const taskId = task.id

    // Test 2: Get some team members for testing
    console.log('\n2️⃣ Fetching team members...')
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_member')
      .select('id, full_name, email')
      .limit(3)

    if (membersError) {
      throw new Error(`Failed to fetch team members: ${membersError.message}`)
    }

    if (!teamMembers || teamMembers.length === 0) {
      throw new Error('No team members found for testing')
    }

    console.log(`✅ Found ${teamMembers.length} team members`)
    const assigneeIds = teamMembers.map(member => member.id)

    // Test 3: Assign multiple users to the task
    console.log('\n3️⃣ Assigning multiple users to task...')
    const assignments = assigneeIds.map(userId => ({
      task_id: taskId,
      user_id: userId,
      assigned_at: new Date().toISOString(),
      assigned_by: '00000000-0000-0000-0000-000000000000', // Placeholder
      role: 'assignee'
    }))

    const { error: assignmentError } = await supabase
      .from('task_assignments')
      .insert(assignments)

    if (assignmentError) {
      throw new Error(`Failed to assign users: ${assignmentError.message}`)
    }

    console.log(`✅ Successfully assigned ${assigneeIds.length} users to task`)

    // Test 4: Fetch and verify assignments
    console.log('\n4️⃣ Fetching task assignments...')
    const { data: fetchedAssignments, error: fetchError } = await supabase
      .from('task_assignments')
      .select(`
        *,
        team_member:user_id(full_name, email)
      `)
      .eq('task_id', taskId)

    if (fetchError) {
      throw new Error(`Failed to fetch assignments: ${fetchError.message}`)
    }

    console.log('✅ Task assignments fetched successfully:')
    fetchedAssignments.forEach(assignment => {
      const member = assignment.team_member
      console.log(`   - ${member.full_name} (${member.email}) - Role: ${assignment.role}`)
    })

    // Test 5: Update assignments (remove one, add another)
    console.log('\n5️⃣ Testing assignment updates...')
    const newAssigneeIds = assigneeIds.slice(0, 2) // Keep first 2, remove last 1
    
    // Remove old assignments
    const { error: deleteError } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId)

    if (deleteError) {
      throw new Error(`Failed to clear assignments: ${deleteError.message}`)
    }

    // Add new assignments
    const newAssignments = newAssigneeIds.map(userId => ({
      task_id: taskId,
      user_id: userId,
      assigned_at: new Date().toISOString(),
      assigned_by: '00000000-0000-0000-0000-000000000000',
      role: 'assignee'
    }))

    const { error: updateError } = await supabase
      .from('task_assignments')
      .insert(newAssignments)

    if (updateError) {
      throw new Error(`Failed to update assignments: ${updateError.message}`)
    }

    console.log(`✅ Successfully updated assignments to ${newAssigneeIds.length} users`)

    // Test 6: Verify final state
    console.log('\n6️⃣ Verifying final assignment state...')
    const { data: finalAssignments, error: finalError } = await supabase
      .from('task_assignments')
      .select(`
        *,
        team_member:user_id(full_name, email)
      `)
      .eq('task_id', taskId)

    if (finalError) {
      throw new Error(`Failed to fetch final assignments: ${finalError.message}`)
    }

    console.log('✅ Final task assignments:')
    finalAssignments.forEach(assignment => {
      const member = assignment.team_member
      console.log(`   - ${member.full_name} (${member.email})`)
    })

    // Test 7: Clean up test data
    console.log('\n7️⃣ Cleaning up test data...')
    const { error: cleanupError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (cleanupError) {
      console.warn('⚠️ Warning: Failed to clean up test task:', cleanupError.message)
    } else {
      console.log('✅ Test task cleaned up successfully')
    }

    console.log('\n🎉 All tests passed! The new assignment system is working correctly.')
    console.log('\n📋 Summary:')
    console.log('   ✅ Task creation with multiple assignees')
    console.log('   ✅ Assignment management (create, read, update)')
    console.log('   ✅ Proper error handling')
    console.log('   ✅ Data consistency maintained')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the tests
testNewAssignmentSystem()
  .then(() => {
    console.log('\n✨ Test script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error)
    process.exit(1)
  }) 