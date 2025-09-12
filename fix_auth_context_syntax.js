const fs = require('fs');

// Read the current file
const filePath = 'contexts/auth-context.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the syntax errors by removing duplicate lines and adding missing commas
console.log('🔧 Fixing syntax errors in auth-context.tsx...');

// Remove duplicate lines and fix missing commas
content = content.replace(
  /roleType: typeof userData\?\.role\s+userData,\s+additionalDataTime: Date\.now\(\) - additionalDataStart,\s+retryCount/g,
  'roleType: typeof userData?.role,\n                additionalDataTime: Date.now() - additionalDataStart,\n                retryCount'
);

// Also fix any other similar patterns
content = content.replace(
  /roleType: typeof userData\?\.role\s+userData,\s+retryCount/g,
  'roleType: typeof userData?.role,\n                retryCount'
);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed syntax errors in auth-context.tsx');
console.log('🔧 Changes made:');
console.log('   - Removed duplicate userData lines');
console.log('   - Added missing commas');
console.log('   - Fixed object literal syntax');
