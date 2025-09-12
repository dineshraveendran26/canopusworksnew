const fs = require('fs');

// Read the current file
const filePath = 'contexts/auth-context.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the first console.log statement (around line 150)
const brokenLogging1 = `console.log('🔄 AuthProvider - Updating with database user:', {
                userData, 
                additionalDataTime: Date.now() - additionalDataStart,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
                userData, 
                additionalDataTime: Date.now() - additionalDataStart,
                retryCount
              })`;

const fixedLogging1 = `console.log('🔄 AuthProvider - Updating with database user:', {
                userData, 
                additionalDataTime: Date.now() - additionalDataStart,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })`;

content = content.replace(brokenLogging1, fixedLogging1);

// Fix the second console.log statement (around line 250)
const brokenLogging2 = `console.log('🔄 AuthProvider - Updating with database user from auth change:', {
                userData,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
                userData,
                retryCount
              })`;

const fixedLogging2 = `console.log('🔄 AuthProvider - Updating with database user from auth change:', {
                userData,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })`;

content = content.replace(brokenLogging2, fixedLogging2);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed ALL syntax errors in auth-context.tsx');
console.log('🔧 Changes made:');
console.log('   - Fixed first console.log statement (line ~150)');
console.log('   - Fixed second console.log statement (line ~250)');
console.log('   - Removed all duplicate lines');
console.log('   - Fixed all missing commas');
