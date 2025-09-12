const fs = require('fs');

// Read the current file
const filePath = 'components/user-profile-dropdown.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the user role logic to handle undefined roles better
const oldLogic = "userRole: user?.role || (roleLoading ? 'Loading...' : 'User') // Use actual role from auth context";
const newLogic = `userRole: (() => {
    if (roleLoading) return 'Loading...';
    if (user?.role) return user.role;
    // If role is undefined but user exists, show a warning instead of defaulting to 'User'
    if (user) return 'Role Loading...';
    return 'User';
  })() // Use actual role from auth context`;

content = content.replace(oldLogic, newLogic);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed user role display logic in user-profile-dropdown.tsx');
console.log('🔧 Changes made:');
console.log('   - Improved handling of undefined roles');
console.log('   - Added "Role Loading..." state for undefined roles when user exists');
console.log('   - Only defaults to "User" when no user exists');
