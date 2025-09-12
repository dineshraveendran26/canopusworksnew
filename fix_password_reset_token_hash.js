const fs = require('fs');

// Read the current file
const filePath = 'app/auth/reset-password/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the problematic logic to handle token_hash instead of code
const problematicLogic = `        if (code) {
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

const fixedLogic = `        // Check for both token_hash (PKCE flow) and code (implicit flow) parameters
        const tokenHash = urlParams.get('token_hash')
        const type = urlParams.get('type')
        
        console.log('Password reset URL params:', { code, tokenHash, type })
        
        if (tokenHash && type === 'recovery') {
          // PKCE flow - verify the token hash
          console.log('Attempting to verify token hash for PKCE flow:', tokenHash)
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          })
          
          if (error) {
            console.error('Error verifying token hash:', error)
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
            return
          }
          
          if (data.session) {
            console.log('Password reset session established successfully via PKCE')
            setIsValidToken(true)
            setMessage('Please enter your new password.')
          } else {
            console.log('No session returned from token hash verification')
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        } else if (code) {
          // Implicit flow - exchange code for session
          console.log('Attempting to exchange code for session:', code)
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Error exchanging code for session:', error)
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
            return
          }
          
          if (data.session) {
            console.log('Password reset session established successfully via implicit flow')
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
            console.log('No valid parameters found and no existing session')
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        }`;

content = content.replace(problematicLogic, fixedLogic);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed password reset page to handle token_hash parameter');
console.log('🔧 Changes made:');
console.log('   - Added support for token_hash parameter (PKCE flow)');
console.log('   - Added support for code parameter (implicit flow)');
console.log('   - Added proper type checking for recovery flow');
console.log('   - Enhanced logging for both flows');
console.log('   - Improved error handling');
