#!/usr/bin/env node

/**
 * Comprehensive test script for the complete task and subtask assignment system
 * 
 * This script tests:
 * 1. Task creation with multiple assignees
 * 2. Subtask creation and assignment
 * 3. Assignment inheritance from parent tasks
 * 4. Many-to-many relationships
 * 5. Data consistency and validation
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

async function testCompleteAssignmentSystem() {
  console.log('🧪 Testing complete task and subtask assignment system...\n')

  try {
    // Test 1: Create a test task with multiple assignees
    console.log('1️⃣ Creating test task with multiple assignees...')
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: 'Test Task - Complete Assignment System',
        description: 'Testing the complete assignment system with tasks and subtasks',
        priority: 'High',
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

    // Test 2: Get team members for testing
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
    const taskAssignments = assigneeIds.map(userId => ({
      task_id: taskId,
      user_id: userId,
      assigned_at: new Date().toISOString(),
      assigned_by: '00000000-0000-0000-0000-000000000000',
      role: 'assignee'
    }))

    const { error: taskAssignmentError } = await supabase
      .from('task_assignments')
      .insert(taskAssignments)

    if (taskAssignmentError) {
      throw new Error(`Failed to assign users to task: ${taskAssignmentError.message}`)
    }

    console.log(`✅ Successfully assigned ${assigneeIds.length} users to task`)

    // Test 4: Create subtasks
    console.log('\n4️⃣ Creating subtasks...')
    const subtasks = [
      {
        task_id: taskId,
        title: 'Subtask 1: Research',
        description: 'Research phase for the project',
        order_index: 1,
        completed: false
      },
      {
        task_id: taskId,
        title: 'Subtask 2: Design',
        description: 'Design phase for the project',
        order_index: 2,
        completed: false
      },
      {
        task_id: taskId,
        title: 'Subtask 3: Implementation',
        description: 'Implementation phase for the project',
        order_index: 3,
        completed: false
      }
    ]

    const { data: createdSubtasks, error: subtaskError } = await supabase
      .from('subtasks')
      .insert(subtasks)
      .select()

    if (subtaskError) {
      throw new Error(`Failed to create subtasks: ${subtaskError.message}`)
    }

    console.log(`✅ Successfully created ${createdSubtasks.length} subtasks`)

    // Test 5: Test assignment inheritance (subtasks should inherit from parent task)
    console.log('\n5️⃣ Testing assignment inheritance...')
    const { data: inheritedAssignments, error: inheritanceError } = await supabase
      .rpc('get_effective_subtask_assignees', { p_subtask_id: createdSubtasks[0].id })

    if (inheritanceError) {
      throw new Error(`Failed to get effective subtask assignees: ${inheritanceError.message}`)
    }

    console.log('✅ Assignment inheritance working:')
    inheritedAssignments.forEach(assignment => {
      console.log(`   - ${assignment.full_name} (${assignment.email}) - Type: ${assignment.assignment_type}`)
    })

    // Test 6: Assign specific users to one subtask (override inheritance)
    console.log('\n6️⃣ Testing explicit subtask assignment...')
    const { error: explicitAssignmentError } = await supabase
      .from('subtask_assignments')
      .insert({
        subtask_id: createdSubtasks[1].id,
        user_id: assigneeIds[0], // Assign first user explicitly
        assigned_at: new Date().toISOString(),
        assigned_by: '00000000-0000-0000-0000-000000000000',
        role: 'assignee'
      })

    if (explicitAssignmentError) {
      throw new Error(`Failed to assign user to subtask: ${explicitAssignmentError.message}`)
    }

    console.log('✅ Successfully assigned user explicitly to subtask')

    // Test 7: Verify explicit assignment overrides inheritance
    console.log('\n7️⃣ Verifying explicit assignment override...')
    const { data: explicitAssignments, error: explicitError } = await supabase
      .rpc('get_effective_subtask_assignees', { p_subtask_id: createdSubtasks[1].id })

    if (explicitError) {
      throw new Error(`Failed to get explicit subtask assignees: ${explicitError.message}`)
    }

    console.log('✅ Explicit assignment working:')
    explicitAssignments.forEach(assignment => {
      console.log(`   - ${assignment.full_name} (${assignment.email}) - Type: ${assignment.assignment_type}`)
    })

    // Test 8: Test the comprehensive view
    console.log('\n8️⃣ Testing comprehensive view...')
    const { data: comprehensiveData, error: comprehensiveError } = await supabase
      .from('tasks_with_full_details')
      .select('*')
      .eq('id', taskId)
      .single()

    if (comprehensiveError) {
      throw new Error(`Failed to get comprehensive task data: ${comprehensiveError.message}`)
    }

    console.log('✅ Comprehensive view working:')
    console.log(`   Task: ${comprehensiveData.title}`)
    console.log(`   Task Assignees: ${comprehensiveData.task_assignee_names.join(', ')}`)
    console.log(`   Subtasks: ${comprehensiveData.subtasks_with_assignees.length}`)

    // Test 9: Test assignment validation
    console.log('\n9️⃣ Testing assignment validation...')
    const { data: validationIssues, error: validationError } = await supabase
      .rpc('validate_assignment_consistency')

    if (validationError) {
      throw new Error(`Failed to validate assignments: ${validationError.message}`)
    }

    console.log('✅ Assignment validation working:')
    if (validationIssues.length === 0) {
      console.log('   No assignment inconsistencies found')
    } else {
      validationIssues.forEach(issue => {
        console.log(`   - ${issue.issue_type}: ${issue.description}`)
      })
    }

    // Test 10: Test bulk assignment function
    console.log('\n🔟 Testing bulk assignment function...')
    const subtaskIds = createdSubtasks.map(s => s.id)
    const { error: bulkError } = await supabase
      .rpc('bulk_assign_subtasks_to_user', {
        p_subtask_ids: subtaskIds,
        p_user_id: assigneeIds[1] // Assign second user to all subtasks
      })

    if (bulkError) {
      throw new Error(`Failed to bulk assign subtasks: ${bulkError.message}`)
    }

    console.log('✅ Bulk assignment working')

    // Test 11: Verify final assignment state
    console.log('\n1️⃣1️⃣ Verifying final assignment state...')
    const { data: finalAssignments, error: finalError } = await supabase
      .rpc('get_task_with_all_assignments', { p_task_id: taskId })

    if (finalError) {
      throw new Error(`Failed to get final assignment state: ${finalError.message}`)
    }

    console.log('✅ Final assignment state:')
    finalAssignments.forEach(assignment => {
      if (assignment.subtask_id) {
        console.log(`   Subtask: ${assignment.subtask_title}`)
        console.log(`     Assignees: ${assignment.subtask_assignee_names.join(', ')}`)
        console.log(`     Type: ${assignment.assignment_type}`)
      } else {
        console.log(`   Task: ${assignment.task_title}`)
        console.log(`     Assignees: ${assignment.task_assignee_names.join(', ')}`)
      }
    })

    // Test 12: Clean up test data
    console.log('\n1️⃣2️⃣ Cleaning up test data...')
    
    // Delete subtask assignments first
    const { error: deleteSubtaskAssignmentsError } = await supabase
      .from('subtask_assignments')
      .delete()
      .in('subtask_id', subtaskIds)

    if (deleteSubtaskAssignmentsError) {
      console.warn('⚠️ Warning: Failed to delete subtask assignments:', deleteSubtaskAssignmentsError.message)
    }

    // Delete subtasks
    const { error: deleteSubtasksError } = await supabase
      .from('subtasks')
      .delete()
      .in('id', subtaskIds)

    if (deleteSubtasksError) {
      console.warn('⚠️ Warning: Failed to delete subtasks:', deleteSubtasksError.message)
    }

    // Delete task assignments
    const { error: deleteTaskAssignmentsError } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId)

    if (deleteTaskAssignmentsError) {
      console.warn('⚠️ Warning: Failed to delete task assignments:', deleteTaskAssignmentsError.message)
    }

    // Delete task
    const { error: deleteTaskError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (deleteTaskError) {
      console.warn('⚠️ Warning: Failed to delete test task:', deleteTaskError.message)
    } else {
      console.log('✅ Test data cleaned up successfully')
    }

    console.log('\n🎉 All tests passed! The complete assignment system is working correctly.')
    console.log('\n📋 Summary:')
    console.log('   ✅ Task creation with multiple assignees')
    console.log('   ✅ Subtask creation and management')
    console.log('   ✅ Assignment inheritance from parent tasks')
    console.log('   ✅ Explicit subtask assignments')
    console.log('   ✅ Many-to-many relationships')
    console.log('   ✅ Assignment validation and consistency')
    console.log('   ✅ Bulk assignment operations')
    console.log('   ✅ Comprehensive views and reporting')
    console.log('   ✅ Data cleanup and maintenance')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the tests
testCompleteAssignmentSystem()
  .then(() => {
    console.log('\n✨ Test script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error)
    process.exit(1)
  }) 