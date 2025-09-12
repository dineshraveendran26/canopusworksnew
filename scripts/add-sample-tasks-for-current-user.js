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

async function addSampleTasksForCurrentUser() {
  try {
    console.log('🔍 Getting current user...')
    
    // Get the user you're currently signed in as
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      throw userError
    }
    
    // Find the user you're signed in as (you can modify this email)
    const currentUser = users.find(u => u.email === 'dineshraveendran26@gmail.com')
    
    if (!currentUser) {
      console.error('❌ User not found. Please check the email address.')
      return
    }
    
    console.log('✅ Found user:', currentUser.email, 'ID:', currentUser.id)
    
    // Add sample tasks for this user
    const sampleTasks = [
      {
        title: 'Setup production line calibration',
        description: 'Calibrate all production line equipment for optimal performance',
        priority: 'High',
        status: 'Todo',
        start_date: '2024-01-15',
        due_date: '2024-01-20',
        created_by: currentUser.id,
        assigned_to: currentUser.id,
        department: 'Production'
      },
      {
        title: 'Quality control inspection',
        description: 'Comprehensive quality control inspection of recent production batches',
        priority: 'Critical',
        status: 'Todo',
        start_date: '2024-01-16',
        due_date: '2024-01-18',
        created_by: currentUser.id,
        assigned_to: currentUser.id,
        department: 'Quality'
      },
      {
        title: 'Machine maintenance schedule',
        description: 'Regular maintenance schedule for all manufacturing equipment',
        priority: 'Medium',
        status: 'In Progress',
        start_date: '2024-01-14',
        due_date: '2024-01-22',
        created_by: currentUser.id,
        assigned_to: currentUser.id,
        department: 'Maintenance'
      },
      {
        title: 'Safety protocol review',
        description: 'Annual review and update of all safety protocols',
        priority: 'Low',
        status: 'Completed',
        start_date: '2024-01-10',
        due_date: '2024-01-15',
        created_by: currentUser.id,
        assigned_to: currentUser.id,
        department: 'Safety'
      }
    ]
    
    console.log('🔄 Adding sample tasks...')
    
    const { data: insertedTasks, error: insertError } = await supabase
      .from('tasks')
      .insert(sampleTasks)
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting tasks:', insertError)
      return
    }
    
    console.log('✅ Successfully added', insertedTasks.length, 'sample tasks!')
    console.log('📋 Tasks added:')
    insertedTasks.forEach(task => {
      console.log(`  - ${task.title} (${task.status})`)
    })
    
    console.log('\n🎉 Sample tasks are now available in your app!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

addSampleTasksForCurrentUser() 