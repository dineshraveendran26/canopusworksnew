#!/usr/bin/env node

/**
 * Test script for the complete frontend assignment system
 * This script tests the integration between tasks, subtasks, and assignments
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

async function testCompleteFrontendSystem() {
  console.log('🧪 Testing complete frontend assignment system...\n')

  try {
    // Test 1: Create a test task
    console.log('1️⃣ Creating test task...')
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: 'Frontend Test Task',
        description: 'Testing the complete frontend assignment system',
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

    // Test 2: Get team members
    console.log('\n2️⃣ Fetching team members...')
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_member')
      .select('id, full_name, email')
      .limit(2)

    if (membersError) {
      throw new Error(`Failed to fetch team members: ${membersError.message}`)
    }

    if (!teamMembers || teamMembers.length === 0) {
      throw new Error('No team members found for testing')
    }

    console.log(`✅ Found ${teamMembers.length} team members`)
    const assigneeIds = teamMembers.map(member => member.id)

    // Test 3: Assign users to task
    console.log('\n3️⃣ Assigning users to task...')
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
        title: 'Frontend Subtask 1: Setup',
        description: 'Setup the frontend environment',
        order_index: 1,
        completed: false
      },
      {
        task_id: taskId,
        title: 'Frontend Subtask 2: Implementation',
        description: 'Implement the assignment logic',
        order_index: 2,
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

    // Test 5: Test subtask assignment inheritance
    console.log('\n5️⃣ Testing subtask assignment inheritance...')
    const { data: inheritedAssignments, error: inheritanceError } = await supabase
      .rpc('get_effective_subtask_assignees', { p_subtask_id: createdSubtasks[0].id })

    if (inheritanceError) {
      throw new Error(`Failed to get effective subtask assignees: ${inheritanceError.message}`)
    }

    console.log('✅ Assignment inheritance working:')
    inheritedAssignments.forEach(assignment => {
      console.log(`   - ${assignment.full_name} (${assignment.email}) - Type: ${assignment.assignment_type}`)
    })

    // Test 6: Assign specific user to subtask (override inheritance)
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

    // Test 7: Test the views
    console.log('\n7️⃣ Testing database views...')
    
    // Test tasks_with_assignees view
    const { data: tasksWithAssignees, error: tasksViewError } = await supabase
      .from('tasks_with_assignees')
      .select('*')
      .eq('id', taskId)
      .single()

    if (tasksViewError) {
      throw new Error(`Failed to query tasks_with_assignees view: ${tasksViewError.message}`)
    }

    console.log('✅ tasks_with_assignees view working:')
    console.log(`   Task: ${tasksWithAssignees.title}`)
    console.log(`   Assignees: ${tasksWithAssignees.assignee_names.join(', ')}`)

    // Test subtasks_with_assignees view
    const { data: subtasksWithAssignees, error: subtasksViewError } = await supabase
      .from('subtasks_with_assignees')
      .select('*')
      .eq('task_id', taskId)

    if (subtasksViewError) {
      throw new Error(`Failed to query subtasks_with_assignees view: ${subtasksViewError.message}`)
    }

    console.log('✅ subtasks_with_assignees view working:')
    subtasksWithAssignees.forEach(subtask => {
      console.log(`   Subtask: ${subtask.title}`)
      console.log(`     Assignees: ${subtask.assignee_names.join(', ')}`)
    })

    // Test 8: Test helper functions
    console.log('\n8️⃣ Testing helper functions...')
    
    // Test assign_users_to_subtask function
    const { error: assignFunctionError } = await supabase
      .rpc('assign_users_to_subtask', {
        p_subtask_id: createdSubtasks[0].id,
        p_user_ids: [assigneeIds[1]], // Assign second user
        p_assigned_by: '00000000-0000-0000-0000-000000000000'
      })

    if (assignFunctionError) {
      throw new Error(`Failed to test assign_users_to_subtask function: ${assignFunctionError.message}`)
    }

    console.log('✅ assign_users_to_subtask function working')

    // Test 9: Test comprehensive view
    console.log('\n9️⃣ Testing comprehensive view...')
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

    // Test 10: Clean up test data
    console.log('\n🔟 Cleaning up test data...')
    
    // Delete subtask assignments first
    const subtaskIds = createdSubtasks.map(s => s.id)
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

    console.log('\n🎉 All frontend system tests passed!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Task creation and assignment')
    console.log('   ✅ Subtask creation and assignment')
    console.log('   ✅ Assignment inheritance from parent tasks')
    console.log('   ✅ Explicit subtask assignments')
    console.log('   ✅ Database views working correctly')
    console.log('   ✅ Helper functions working')
    console.log('   ✅ Comprehensive data retrieval')
    console.log('   ✅ Data cleanup')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the tests
testCompleteFrontendSystem()
  .then(() => {
    console.log('\n✨ Frontend system test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Frontend system test failed:', error)
    process.exit(1)
  }) 