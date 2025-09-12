const fs = require('fs');

// Read the current file
const filePath = 'components/user-profile-dropdown.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add logout state to prevent multiple calls
const logoutStateDeclaration = `  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)`;

const logoutStateWithLogout = `  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)`;

content = content.replace(logoutStateDeclaration, logoutStateWithLogout);

// Fix the handleLogout function to prevent multiple calls
const problematicLogout = `  const handleLogout = async () => {
    try {
      console.log('🔄 UserProfileDropdown - handleLogout called')
      await signOut()
      setIsOpen(false)
      console.log('🔄 UserProfileDropdown - signOut completed, redirecting...')
      // Force redirect to landing page after logout
      window.location.href = '/'
    } catch (error) {
      console.error("Error signing out:", error)
      // Even if there's an error, try to redirect
      window.location.href = '/'
    }
  }`;

const fixedLogout = `  const handleLogout = async () => {
    // Prevent multiple logout calls
    if (isLoggingOut) {
      console.log('🔄 UserProfileDropdown - Logout already in progress, ignoring')
      return
    }
    
    try {
      setIsLoggingOut(true)
      console.log('🔄 UserProfileDropdown - handleLogout called')
      await signOut()
      setIsOpen(false)
      console.log('🔄 UserProfileDropdown - signOut completed, redirecting...')
      // Force redirect to landing page after logout
      window.location.href = '/'
    } catch (error) {
      console.error("Error signing out:", error)
      setIsLoggingOut(false)
      // Even if there's an error, try to redirect
      window.location.href = '/'
    }
  }`;

content = content.replace(problematicLogout, fixedLogout);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed logout loop issue in user-profile-dropdown.tsx');
console.log('🔧 Changes made:');
console.log('   - Added isLoggingOut state to prevent multiple calls');
console.log('   - Added guard clause to prevent duplicate logout calls');
console.log('   - Improved error handling');
