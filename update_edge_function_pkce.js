const fs = require('fs');

// Create the updated Edge Function content for PKCE flow
const updatedEdgeFunction = `import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { userData } = await req.json();
    const { userId, userEmail, userName, userRole, approvedBy } = userData;

    console.log('📧 Sending approval email for:', {
      userEmail,
      userName,
      userRole
    });

    // Get permission details based on role
    const getPermissionDetails = (role) => {
      switch (role) {
        case 'administrator':
          return {
            title: 'Administrator',
            permissions: [
              'Full system access and control',
              'Create, edit, and delete all tasks',
              'Manage all users and team members',
              'Approve or reject user registrations',
              'Access all departments and projects',
              'View and manage system settings',
              'Create and assign tasks to any team member',
              'Access all reports and analytics'
            ],
            restrictions: 'No restrictions - full administrative access'
          };
        case 'manager':
          return {
            title: 'Manager',
            permissions: [
              'Create and manage tasks in assigned departments',
              'Assign tasks to team members',
              'View team member progress and reports',
              'Approve or reject tasks within department',
              'Access department-specific analytics',
              'Manage team member assignments',
              'Create subtasks and track progress'
            ],
            restrictions: 'Limited to assigned departments and team members'
          };
        case 'viewer':
          return {
            title: 'Team Member',
            permissions: [
              'View assigned tasks and subtasks',
              'Update task progress and status',
              'Add comments and attachments to tasks',
              'View team member information',
              'Access personal dashboard',
              'View task deadlines and priorities'
            ],
            restrictions: 'Can only view and update assigned tasks'
          };
        default:
          return {
            title: 'Team Member',
            permissions: [
              'View assigned tasks',
              'Update task status',
              'Add comments to tasks'
            ],
            restrictions: 'Limited access to assigned tasks only'
          };
      }
    };

    const permissionDetails = getPermissionDetails(userRole);

    // Check if user exists in auth.users by trying to generate a link
    let resetLink = '';
    let authUserExists = false;

    try {
      // Try to generate password reset link first
      const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail,
        options: {
          redirectTo: \`\${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3002'}/auth/reset-password\`
        }
      });

      if (!resetError && resetData.properties.action_link) {
        // For PKCE flow, we need to extract the token_hash from the action_link
        // and construct a proper PKCE-compatible link
        const actionLink = resetData.properties.action_link;
        console.log('🔗 Generated action link:', actionLink);
        
        // Extract token_hash from the action_link URL
        const url = new URL(actionLink);
        const tokenHash = url.searchParams.get('token_hash');
        
        if (tokenHash) {
          // Construct PKCE-compatible reset link
          resetLink = \`\${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3002'}/auth/reset-password?token_hash=\${tokenHash}&type=recovery\`;
          console.log('✅ PKCE-compatible reset link generated:', resetLink);
        } else {
          // Fallback to original link if token_hash not found
          resetLink = actionLink;
          console.log('⚠️ Using original action link as fallback');
        }
        
        authUserExists = true;
        console.log('✅ Password reset link generated for existing auth user');
      } else {
        console.log('👤 User not found in auth.users, creating auth user first:', userEmail);
        
        // Create user in auth.users
        const { data: createUserData, error: createUserError } = await supabase.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: {
            full_name: userName,
            role: userRole
          }
        });

        if (createUserError) {
          console.error('❌ Error creating auth user:', createUserError);
          throw new Error(\`Failed to create auth user: \${createUserError.message}\`);
        }

        console.log('✅ Auth user created successfully:', createUserData.user?.id);

        // Now generate the password reset link
        const { data: newResetData, error: newResetError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: userEmail,
          options: {
            redirectTo: \`\${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3002'}/auth/reset-password\`
          }
        });

        if (newResetError) {
          console.error('❌ Password reset link generation error after user creation:', newResetError);
          throw new Error(\`Failed to generate password reset link: \${newResetError.message}\`);
        }

        // For PKCE flow, extract token_hash and construct proper link
        const actionLink = newResetData.properties.action_link;
        console.log('🔗 Generated action link for new user:', actionLink);
        
        const url = new URL(actionLink);
        const tokenHash = url.searchParams.get('token_hash');
        
        if (tokenHash) {
          resetLink = \`\${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3002'}/auth/reset-password?token_hash=\${tokenHash}&type=recovery\`;
          console.log('✅ PKCE-compatible reset link generated for new user:', resetLink);
        } else {
          resetLink = actionLink;
          console.log('⚠️ Using original action link as fallback for new user');
        }
      }
    } catch (error) {
      console.error('❌ Password reset link error:', error);
      throw new Error(\`Failed to generate password reset link: \${error.message}\`);
    }

    // Create HTML email content
    const emailHtml = \`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Account Approved - Canopus Works</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .permission-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
        .permission-list { margin: 15px 0; }
        .permission-list li { margin: 8px 0; padding-left: 10px; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .role-badge { background: #667eea; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to Canopus Works!</h1>
        <p>Your account has been approved and is ready to use</p>
    </div>
    
    <div class="content">
        <h2>Hello \${userName}!</h2>
        
        <p>Great news! Your account has been approved by an administrator and you now have access to the Canopus Works task management system.</p>
        
        <div class="permission-box">
            <h3>Your Role: <span class="role-badge">\${permissionDetails.title}</span></h3>
            
            <h4>What you can do:</h4>
            <ul class="permission-list">
                \${permissionDetails.permissions.map((permission) => \`<li>\${permission}</li>\`).join('')}
            </ul>
            
            <p><strong>Access Level:</strong> \${permissionDetails.restrictions}</p>
        </div>
        
        <h3>Next Steps:</h3>
        <ol>
            <li><strong>Set Your Password:</strong> Click the button below to create your password</li>
            <li><strong>Log In:</strong> Use your email and new password to access the system</li>
            <li><strong>Explore:</strong> Check out your dashboard and assigned tasks</li>
        </ol>
        
        <div style="text-align: center;">
            <a href="\${resetLink}" class="cta-button">Set Password & Access System</a>
        </div>
        
        <p><strong>Important:</strong> This link will expire in 24 hours for security reasons. If you need a new link, contact your administrator.</p>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact your administrator or support team.</p>
        
        <p>Welcome aboard!</p>
        <p><strong>The Canopus Works Team</strong></p>
    </div>
    
    <div class="footer">
        <p>This email was sent because your account was approved by an administrator.</p>
        <p>Canopus Works - Manufacturing Task Management System</p>
    </div>
</body>
</html>
    \`;

    // Log the email content for testing
    console.log('📧 Approval email prepared:', {
      to: userEmail,
      subject: 'Account Approved - Canopus Works',
      resetLink: resetLink,
      userRole: permissionDetails.title,
      authUserCreated: !authUserExists
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Approval email prepared successfully',
      resetLink: resetLink,
      userRole: permissionDetails.title,
      permissions: permissionDetails.permissions,
      authUserCreated: !authUserExists,
      emailContent: {
        to: userEmail,
        subject: 'Account Approved - Canopus Works',
        html: emailHtml
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Edge function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error: ' + error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
`;

// Write the updated Edge Function
fs.writeFileSync('edge-function-updated.ts', updatedEdgeFunction);

console.log('✅ Updated Edge Function for PKCE flow');
console.log('🔧 Changes made:');
console.log('   - Extract token_hash from generated action_link');
console.log('   - Construct PKCE-compatible reset link with token_hash parameter');
console.log('   - Added proper URL parsing and construction');
console.log('   - Enhanced logging for debugging');
console.log('');
console.log('📁 Updated function saved to: edge-function-updated.ts');
console.log('🚀 Ready to deploy to Supabase');
