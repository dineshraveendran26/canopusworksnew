const fs = require('fs');

// Read the current file
const filePath = 'app/auth/reset-password/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the duplicate type variable declaration
const problematicCode = `        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const type = urlParams.get('type')
        
        console.log('Password reset URL params:', { code, type })
        
        // Check for both token_hash (PKCE flow) and code (implicit flow) parameters
        const tokenHash = urlParams.get('token_hash')
        const type = urlParams.get('type')`;

const fixedCode = `        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const tokenHash = urlParams.get('token_hash')
        const type = urlParams.get('type')
        
        console.log('Password reset URL params:', { code, tokenHash, type })`;

content = content.replace(problematicCode, fixedCode);

// Write the updated content back
fs.writeFileSync(filePath, content);

console.log('✅ Fixed duplicate variable declaration in password reset page');
console.log('🔧 Changes made:');
console.log('   - Removed duplicate type variable declaration');
console.log('   - Consolidated URL parameter extraction');
console.log('   - Fixed variable scope issues');
