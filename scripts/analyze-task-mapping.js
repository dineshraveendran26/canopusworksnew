const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function analyzeTaskMapping() {
  console.log('🔍 Analyzing Task Mapping for "Setup production line calibration"\n')
  
  try {
    // 1. Find the task by title
    console.log('1️⃣ Searching for task: "Setup production line calibration"')
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .ilike('title', '%Setup production line calibration%')
    
    if (taskError) {
      console.error('❌ Error fetching tasks:', taskError)
      return
    }
    
    if (!tasks || tasks.length === 0) {
      console.log('❌ No task found with that title')
      return
    }
    
    const task = tasks[0]
    console.log('✅ Task found:')
    console.log(`   ID: ${task.id}`)
    console.log(`   Title: ${task.title}`)
    console.log(`   Description: ${task.description}`)
    console.log(`   Status: ${task.status}`)
    console.log(`   Priority: ${task.priority}`)
    console.log(`   Start Date: ${task.start_date}`)
    console.log(`   Due Date: ${task.due_date}`)
    console.log(`   Department: ${task.department}`)
    console.log(`   Created By: ${task.created_by}`)
    console.log(`   Created At: ${task.created_at}`)
    console.log(`   Updated At: ${task.updated_at}`)
    
    // 2. Get task assignments
    console.log('\n2️⃣ Fetching task assignments...')
    const { data: taskAssignments, error: taError } = await supabase
      .from('task_assignments')
      .select(`
        *,
        team_member:team_member(id, email, full_name)
      `)
      .eq('task_id', task.id)
    
    if (taError) {
      console.error('❌ Error fetching task assignments:', taError)
    } else {
      console.log(`✅ Task Assignments (${taskAssignments?.length || 0}):`)
      if (taskAssignments && taskAssignments.length > 0) {
        taskAssignments.forEach(ta => {
          console.log(`   - User: ${ta.team_member?.full_name || ta.team_member?.email} (${ta.user_id})`)
          console.log(`     Role: ${ta.role}`)
          console.log(`     Assigned At: ${ta.assigned_at}`)
        })
      } else {
        console.log('   No assignees found')
      }
    }
    
    // 3. Get subtasks
    console.log('\n3️⃣ Fetching subtasks...')
    const { data: subtasks, error: subtaskError } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', task.id)
      .order('order_index', { ascending: true })
    
    if (subtaskError) {
      console.error('❌ Error fetching subtasks:', subtaskError)
    } else {
      console.log(`✅ Subtasks (${subtasks?.length || 0}):`)
      if (subtasks && subtasks.length > 0) {
        subtasks.forEach((subtask, index) => {
          console.log(`   ${index + 1}. ${subtask.title}`)
          console.log(`      ID: ${subtask.id}`)
          console.log(`      Description: ${subtask.description}`)
          console.log(`      Completed: ${subtask.completed}`)
          console.log(`      Order Index: ${subtask.order_index}`)
          console.log(`      Estimated Hours: ${subtask.estimated_hours}`)
          console.log(`      Actual Hours: ${subtask.actual_hours}`)
          console.log(`      Completed At: ${subtask.completed_at}`)
        })
      } else {
        console.log('   No subtasks found')
      }
    }
    
    // 4. Get subtask assignments for each subtask
    if (subtasks && subtasks.length > 0) {
      console.log('\n4️⃣ Fetching subtask assignments...')
      for (const subtask of subtasks) {
        const { data: subtaskAssignments, error: saError } = await supabase
          .from('subtask_assignments')
          .select(`
            *,
            team_member:team_member(id, email, full_name)
          `)
          .eq('subtask_id', subtask.id)
        
        if (saError) {
          console.error(`❌ Error fetching assignments for subtask ${subtask.title}:`, saError)
        } else {
          console.log(`\n   📋 Subtask: ${subtask.title}`)
          console.log(`      Assignments (${subtaskAssignments?.length || 0}):`)
          if (subtaskAssignments && subtaskAssignments.length > 0) {
            subtaskAssignments.forEach(sa => {
              console.log(`         - User: ${sa.team_member?.full_name || sa.team_member?.email} (${sa.user_id})`)
              console.log(`           Role: ${sa.role}`)
              console.log(`           Assigned At: ${sa.assigned_at}`)
            })
          } else {
            console.log('         No assignees found')
          }
        }
      }
    }
    
    // 5. Check the views
    console.log('\n5️⃣ Testing database views...')
    
    // Test tasks_with_assignees view
    const { data: taskWithAssignees, error: twaError } = await supabase
      .from('tasks_with_assignees')
      .select('*')
      .eq('id', task.id)
    
    if (twaError) {
      console.error('❌ Error fetching from tasks_with_assignees view:', twaError)
    } else {
      console.log('✅ tasks_with_assignees view working:')
      if (taskWithAssignees && taskWithAssignees.length > 0) {
        const t = taskWithAssignees[0]
        console.log(`   Assignee IDs: ${t.assignee_ids?.join(', ') || 'None'}`)
        console.log(`   Assignee Emails: ${t.assignee_emails?.join(', ') || 'None'}`)
        console.log(`   Assignee Names: ${t.assignee_names?.join(', ') || 'None'}`)
      }
    }
    
    // Test subtasks_with_assignees view
    const { data: subtasksWithAssignees, error: swaError } = await supabase
      .from('subtasks_with_assignees')
      .select('*')
      .eq('task_id', task.id)
    
    if (swaError) {
      console.error('❌ Error fetching from subtasks_with_assignees view:', swaError)
    } else {
      console.log('✅ subtasks_with_assignees view working:')
      if (subtasksWithAssignees && subtasksWithAssignees.length > 0) {
        subtasksWithAssignees.forEach(s => {
          console.log(`   Subtask: ${s.title}`)
          console.log(`     Assignee IDs: ${s.assignee_ids?.join(', ') || 'None'}`)
          console.log(`     Assignee Emails: ${s.assignee_emails?.join(', ') || 'None'}`)
          console.log(`     Assignee Names: ${s.assignee_names?.join(', ') || 'None'}`)
        })
      }
    }
    
    // 6. Check team_member table structure
    console.log('\n6️⃣ Checking team_member table structure...')
    const { data: teamMembers, error: tmError } = await supabase
      .from('team_member')
      .select('*')
      .limit(5)
    
    if (tmError) {
      console.error('❌ Error fetching team members:', tmError)
    } else {
      console.log(`✅ Team Members (showing first ${teamMembers?.length || 0}):`)
      if (teamMembers && teamMembers.length > 0) {
        teamMembers.forEach(tm => {
          console.log(`   - ${tm.full_name || tm.email} (${tm.id})`)
          console.log(`     Email: ${tm.email}`)
          console.log(`     Role: ${tm.role}`)
          console.log(`     Department: ${tm.department}`)
        })
      } else {
        console.log('   No team members found')
      }
    }
    
    console.log('\n🎯 Analysis Complete!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the analysis
analyzeTaskMapping() 