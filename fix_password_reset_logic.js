const fs = require('fs');

// Read the current file
const filePath = 'app/auth/reset-password/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the problematic logic
const problematicLogic = `        if (code && type === 'recovery') {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Error exchanging code for session:', error)
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
            return
          }
          
          if (data.session) {
            console.log('Password reset session established successfully')
            setIsValidToken(true)
            setMessage('Please enter your new password.')
          } else {
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        } else {
          // Check if we already have a valid session
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsValidToken(true)
            setMessage('Please enter your new password.')
          } else {
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        }`;

const fixedLogic = `        if (code) {
          console.log('Attempting to exchange code for session:', code)
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Error exchanging code for session:', error)
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
            return
          }
          
          if (data.session) {
            console.log('Password reset session established successfully')
            setIsValidToken(true)
            setMessage('Please enter your new password.')
          } else {
            console.log('No session returned from code exchange')
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        } else {
          // Check if we already have a valid session
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('Existing session found')
            setIsValidToken(true)
            setMessage('Please enter your new password.')
          } else {
            console.log('No code parameter and no existing session')
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        }`;

content = content.replace(problematicLogic, fixedLogic);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed password reset logic to handle code parameter properly');
console.log('🔧 Changes made:');
console.log('   - Removed type === "recovery" check');
console.log('   - Now processes any code parameter');
console.log('   - Added more detailed logging');
console.log('   - Improved error handling');
