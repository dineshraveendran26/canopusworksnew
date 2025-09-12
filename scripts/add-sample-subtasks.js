require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addSampleSubtasks() {
  try {
    console.log('🔍 Getting existing tasks...')
    
    // Get all tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(5) // Get first 5 tasks
    
    if (tasksError) {
      throw tasksError
    }
    
    if (!tasks || tasks.length === 0) {
      console.log('❌ No tasks found. Please create some tasks first.')
      return
    }
    
    console.log('✅ Found', tasks.length, 'tasks')
    
    // Sample subtasks for each task
    const sampleSubtasks = []
    
    tasks.forEach((task, index) => {
      const taskSubtasks = [
        {
          task_id: task.id,
          title: `Step 1: Initial planning for ${task.title}`,
          description: 'Plan and prepare for the task execution',
          completed: false,
          order_index: 1,
          estimated_hours: 2
        },
        {
          task_id: task.id,
          title: `Step 2: Execute ${task.title}`,
          description: 'Perform the main task activities',
          completed: false,
          order_index: 2,
          estimated_hours: 4
        },
        {
          task_id: task.id,
          title: `Step 3: Review and validate ${task.title}`,
          description: 'Review the completed work and validate results',
          completed: false,
          order_index: 3,
          estimated_hours: 1
        }
      ]
      
      sampleSubtasks.push(...taskSubtasks)
    })
    
    console.log('🔄 Adding', sampleSubtasks.length, 'sample subtasks...')
    
    const { data: insertedSubtasks, error: insertError } = await supabase
      .from('subtasks')
      .insert(sampleSubtasks)
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting subtasks:', insertError)
      return
    }
    
    console.log('✅ Successfully added', insertedSubtasks.length, 'sample subtasks!')
    console.log('📋 Subtasks added:')
    
    // Group subtasks by task
    const subtasksByTask = {}
    insertedSubtasks.forEach(subtask => {
      if (!subtasksByTask[subtask.task_id]) {
        subtasksByTask[subtask.task_id] = []
      }
      subtasksByTask[subtask.task_id].push(subtask)
    })
    
    Object.entries(subtasksByTask).forEach(([taskId, taskSubtasks]) => {
      const task = tasks.find(t => t.id === taskId)
      console.log(`\n  Task: ${task?.title}`)
      taskSubtasks.forEach(subtask => {
        console.log(`    - ${subtask.title} (${subtask.completed ? 'Completed' : 'Pending'})`)
      })
    })
    
    console.log('\n🎉 Sample subtasks are now available in your app!')
    console.log('🔄 Refresh your app to see the subtasks!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

addSampleSubtasks() 