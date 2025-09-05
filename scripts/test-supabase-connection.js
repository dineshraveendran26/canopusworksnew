require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

// Test Supabase connection with service role key
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('Environment variables:')
  console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET')
  console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET')
  console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET')
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    return
  }
  
  try {
    // Test with anon key first
    console.log('\n🔍 Testing with ANON key...')
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: anonUsers, error: anonError } = await supabaseAnon
      .from('users')
      .select('*')
    
    console.log('Anon key result:', { data: anonUsers?.length || 0, error: anonError })
    
    // Test with service role key
    if (supabaseServiceKey) {
      console.log('\n🔍 Testing with SERVICE ROLE key...')
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data: serviceUsers, error: serviceError } = await supabaseService
        .from('users')
        .select('*')
      
      console.log('Service role key result:', { data: serviceUsers?.length || 0, error: serviceError })
      
      if (serviceUsers && serviceUsers.length > 0) {
        console.log('\n✅ Found users with service role key!')
        console.log('Users:', serviceUsers.map(u => `${u.first_name} ${u.last_name} (${u.email}) - ${u.role}`))
        
        // Find the target user
        const targetUser = serviceUsers.find(u => u.email === 'rrezsoft@gmail.com')
        if (targetUser) {
          console.log(`\n🔍 Found target user: ${targetUser.first_name} ${targetUser.last_name}`)
          console.log('Current role:', targetUser.role)
          
          // Test update with service role
          const { error: updateError } = await supabaseService
            .from('users')
            .update({ role: 'viewer' })
            .eq('id', targetUser.id)
          
          if (updateError) {
            console.error('❌ Update test failed:', updateError)
          } else {
            console.log('✅ Update test successful!')
            
            // Verify the update
            const { data: updatedUser, error: verifyError } = await supabaseService
              .from('users')
              .select('*')
              .eq('id', targetUser.id)
              .single()
            
            console.log('Verification result:', { data: updatedUser, error: verifyError })
            if (updatedUser) {
              console.log('Updated role:', updatedUser.role)
            }
          }
        } else {
          console.log('❌ Target user rrezsoft@gmail.com not found')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testSupabaseConnection() 