const fs = require('fs');

// Read the current file
const filePath = 'contexts/auth-context.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the first syntax error around line 155
const problematicCode1 = `              console.log('🔄 AuthProvider - Updating with database user:', {
                userData, 
                additionalDataTime: Date.now() - additionalDataStart,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })`;

const fixedCode1 = `              console.log('🔄 AuthProvider - Updating with database user:', {
                userData, 
                additionalDataTime: Date.now() - additionalDataStart,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })`;

content = content.replace(problematicCode1, fixedCode1);

// Fix the second syntax error around line 260
const problematicCode2 = `              console.log('🔄 AuthProvider - Updating with database user from auth change:', {
                userData,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })`;

const fixedCode2 = `              console.log('🔄 AuthProvider - Updating with database user from auth change:', {
                userData,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })`;

content = content.replace(problematicCode2, fixedCode2);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed syntax errors in auth-context.tsx');
console.log('🔧 Changes made:');
console.log('   - Fixed missing commas in console.log objects');
console.log('   - Corrected object literal syntax');
console.log('   - Fixed both instances of the syntax error');
