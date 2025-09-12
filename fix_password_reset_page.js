const fs = require('fs');

// Read the current file
const filePath = 'app/auth/reset-password/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the useEffect to properly handle URL parameters
const problematicUseEffect = `  useEffect(() => {
    // Check if we have a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidToken(true)
        setMessage('Please enter your new password.')
      } else {
        setMessage('Invalid or expired reset link. Please request a new password reset.')
        setIsError(true)
      }
    }

    checkSession()
  }, [])`;

const fixedUseEffect = `  useEffect(() => {
    // Handle password reset with URL parameters
    const handlePasswordReset = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const type = urlParams.get('type')
        
        console.log('Password reset URL params:', { code, type })
        
        if (code && type === 'recovery') {
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
        }
      } catch (error) {
        console.error('Error handling password reset:', error)
        setMessage('Invalid or expired reset link. Please request a new password reset.')
        setIsError(true)
      }
    }

    handlePasswordReset()
  }, [])`;

content = content.replace(problematicUseEffect, fixedUseEffect);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed password reset page to handle URL parameters');
console.log('🔧 Changes made:');
console.log('   - Added proper URL parameter handling');
console.log('   - Added code exchange for session');
console.log('   - Improved error handling');
console.log('   - Added debugging logs');
