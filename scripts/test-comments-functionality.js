#!/usr/bin/env node

// Test script to verify comments functionality
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCommentsSystem() {
  try {
    console.log('🧪 Testing Comments System...\n')

    // 1. Test authentication
    console.log('1️⃣ Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ No authenticated user found')
      console.log('ℹ️  Please ensure you are logged in to test comments')
      return
    }
    
    console.log('✅ Authenticated user found:', user.email)

    // 2. Get a task to test with
    console.log('\n2️⃣ Finding a task to test with...')
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title')
      .limit(1)

    if (tasksError || !tasks || tasks.length === 0) {
      console.log('❌ No tasks found to test with')
      return
    }

    const testTask = tasks[0]
    console.log('✅ Using task:', testTask.title, `(${testTask.id})`)

    // 3. Test comment creation
    console.log('\n3️⃣ Testing comment creation...')
    const testComment = {
      task_id: testTask.id,
      author_id: user.id,
      content: `Test comment created at ${new Date().toISOString()}`,
      is_internal: false
    }

    const { data: newComment, error: insertError } = await supabase
      .from('comments')
      .insert([testComment])
      .select()
      .single()

    if (insertError) {
      console.log('❌ Failed to create comment:', insertError.message)
      console.log('📋 Error details:', insertError)
      return
    }

    console.log('✅ Comment created successfully:', newComment.id)

    // 4. Test comment fetching
    console.log('\n4️⃣ Testing comment fetching...')
    const { data: fetchedComments, error: fetchError } = await supabase
      .from('comments')
      .select(`
        *,
        users!inner(id, email, full_name)
      `)
      .eq('task_id', testTask.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.log('❌ Failed to fetch comments:', fetchError.message)
      return
    }

    console.log('✅ Comments fetched successfully:', fetchedComments.length, 'comments')
    fetchedComments.forEach(comment => {
      console.log(`   📝 ${comment.content} (by ${comment.users?.email || 'Unknown'})`)
    })

    // 5. Test comment update
    console.log('\n5️⃣ Testing comment update...')
    const updatedContent = `Updated test comment at ${new Date().toISOString()}`
    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({ 
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', newComment.id)
      .select()
      .single()

    if (updateError) {
      console.log('❌ Failed to update comment:', updateError.message)
    } else {
      console.log('✅ Comment updated successfully')
    }

    // 6. Test comment deletion (cleanup)
    console.log('\n6️⃣ Testing comment deletion (cleanup)...')
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', newComment.id)

    if (deleteError) {
      console.log('❌ Failed to delete comment:', deleteError.message)
    } else {
      console.log('✅ Comment deleted successfully')
    }

    console.log('\n🎉 Comments system test completed!')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

testCommentsSystem() 