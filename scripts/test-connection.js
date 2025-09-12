// Test script to verify Supabase connection
// Run this with: node scripts/test-connection.js

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
    console.error('\nPlease check your .env.local file');
    return;
  }
  
  console.log('✅ Environment variables found');
  console.log('   URL:', supabaseUrl);
  console.log('   Key:', supabaseKey.substring(0, 20) + '...\n');
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔌 Testing database connection...');
    
    // Test a simple query
    const { data: machines, error } = await supabase
      .from('machines')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:');
      console.error('   Error:', error.message);
      return;
    }
    
    console.log('✅ Database connection successful!');
    console.log('   Found', machines.length, 'machines in database');
    
    if (machines.length > 0) {
      console.log('   Sample machine:', machines[0].name);
    }
    
    // Test production batches
    const { data: batches, error: batchError } = await supabase
      .from('production_batches')
      .select('*')
      .limit(1);
    
    if (!batchError && batches.length > 0) {
      console.log('   Found', batches.length, 'production batches');
      console.log('   Sample batch:', batches[0].batch_number);
    }
    
    console.log('\n🎉 All tests passed! Your Supabase setup is working correctly.');
    
  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error('   Error:', error.message);
    console.error('\nThis might indicate:');
    console.error('   - Invalid API key');
    console.error('   - Network connectivity issues');
    console.error('   - Project is paused (check Supabase dashboard)');
  }
}

// Run the test
testConnection(); 