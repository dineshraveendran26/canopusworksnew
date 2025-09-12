const fs = require('fs');

// Read the current file
const filePath = 'contexts/auth-context.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the problematic console.log statement by replacing the entire block
const brokenBlock = `console.log('🔄 AuthProvider - Updating with database user from auth change:', {
                userData,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
                userData,
                retryCount
              })`;

const fixedBlock = `console.log('🔄 AuthProvider - Updating with database user from auth change:', {
                userData,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })`;

content = content.replace(brokenBlock, fixedBlock);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed syntax error in auth-context.tsx');
console.log('🔧 Removed duplicate lines and fixed missing comma');
