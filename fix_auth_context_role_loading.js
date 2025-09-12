const fs = require('fs');

// Read the current file
const filePath = 'contexts/auth-context.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the role loading issue by improving error handling and adding fallback
const problematicSection = `            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error (final):', userError)
              setError(\`User Data Error: \${userError.message}\`)
              // Don't set user with default role - keep loading state
              setRoleLoading(false)
            } else if (userData) {`;

const fixedSection = `            if (userError) {
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

content = content.replace(problematicSection, fixedSection);

// Also fix the auth change handler
const problematicAuthChangeSection = `            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error on Auth Change (final):', userError)
              setError(\`User Data Error: \${userError.message}\`)
              // Don't set user with default role - keep loading state
              setRoleLoading(false)
            } else if (userData) {`;

const fixedAuthChangeSection = `            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error on Auth Change (final):', userError)
              setError(\`User Data Error: \${userError.message}\`)
              // Set role loading to false and provide fallback role
              setRoleLoading(false)
              // If we have basic user data, set a fallback role to prevent infinite loading
              if (user) {
                const fallbackUser = { ...user, role: 'user' }
                console.log('🔄 AuthProvider - Setting fallback role due to database error (auth change):', fallbackUser)
                setUser(fallbackUser)
              }
            } else if (userData) {`;

content = content.replace(problematicAuthChangeSection, fixedAuthChangeSection);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed role loading issue in auth-context.tsx');
console.log('🔧 Changes made:');
console.log('   - Added fallback role when database fetch fails');
console.log('   - Improved error handling to prevent infinite loading');
console.log('   - Fixed both initial load and auth change handlers');
