const fs = require('fs');

// Read the current file
const filePath = 'contexts/auth-context.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add a function to get user role with fallback
const roleFunction = `  const getUserRole = async (userId: string) => {
    try {
      // Try to get role from database first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (userData?.role) {
        return userData.role
      }
      
      // If database query fails, try to get from auth metadata
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.user_metadata?.role) {
        return authUser.user_metadata.role
      }
      
      // Default fallback
      return 'user'
    } catch (error) {
      console.warn('Failed to get user role:', error)
      return 'user'
    }
  }`;

// Insert the function before the signUp function
const signUpFunction = `  const signUp = async (email: string, password: string, metadata?: any) => {`;
content = content.replace(signUpFunction, roleFunction + '\n\n  ' + signUpFunction);

// Update the initial session handler to use the new function
const initialSessionHandler = `          // Try to fetch additional user data from database (non-blocking)
          let retryCount = 0
          const maxRetries = 2
          
          const fetchUserData = async () => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, email, full_name, avatar_url, role')
                .eq('id', session.user.id)
                .single()`;

const updatedInitialSessionHandler = `          // Try to fetch additional user data from database (non-blocking)
          let retryCount = 0
          const maxRetries = 2
          
          const fetchUserData = async () => {
            try {
              // First try to get role using our fallback function
              const role = await getUserRole(session.user.id)
              
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, email, full_name, avatar_url, role')
                .eq('id', session.user.id)
                .single()`;

content = content.replace(initialSessionHandler, updatedInitialSessionHandler);

// Update the error handling to use the fallback role
const errorHandling = `            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error (final):', userError)
              setError(\`User Data Error: \${userError.message}\`)
              // Set role loading to false and provide fallback role
              setRoleLoading(false)
              // If we have basic user data, set a fallback role to prevent infinite loading
              if (user) {
                const fallbackUser = { ...user, role: 'user' }
                console.log('🔄 AuthProvider - Setting fallback role due to database error:', fallbackUser)
                setUser(fallbackUser)
              }
            } else if (userData) {`;

const updatedErrorHandling = `            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error (final):', userError)
              setError(\`User Data Error: \${userError.message}\`)
              // Set role loading to false and provide fallback role
              setRoleLoading(false)
              // Use the role we fetched earlier as fallback
              const fallbackUser = { ...user, role: role || 'user' }
              console.log('🔄 AuthProvider - Setting fallback role due to database error:', fallbackUser)
              setUser(fallbackUser)
            } else if (userData) {`;

content = content.replace(errorHandling, updatedErrorHandling);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Added comprehensive role fallback in auth-context.tsx');
console.log('🔧 Changes made:');
console.log('   - Added getUserRole function with multiple fallback strategies');
console.log('   - Updated initial session handler to use fallback role');
console.log('   - Improved error handling with proper role assignment');
