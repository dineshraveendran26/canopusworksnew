# Testing the Authentication System

## 🧪 **Test the Complete Authentication Flow**

### **1. Start the Application**
```bash
pnpm dev
```

### **2. Test Authentication Flow**

#### **Step 1: Access Authentication Page**
1. Go to [http://localhost:3000/auth](http://localhost:3000/auth)
2. You should see the beautiful authentication page with:
   - Left side: Feature highlights and role explanations
   - Right side: Login form (default)

#### **Step 2: Test Sign Up**
1. Click "Sign up" to switch to the signup form
2. Fill in the form with test data:
   - **Full Name**: Test Administrator
   - **Initials**: TA
   - **Role**: Administrator (to test full access)
   - **Department**: Management
   - **Email**: admin@test.com
   - **Password**: test123456
   - **Confirm Password**: test123456
3. Click "Create account"
4. Check your email for confirmation (or check Supabase dashboard)

#### **Step 3: Test Sign In**
1. Switch back to login form
2. Use the credentials you just created
3. You should be redirected to the dashboard

#### **Step 4: Verify Dashboard Access**
1. You should see the dashboard with your user info in the header
2. Check that your role badge shows "Administrator" with a crown icon
3. Verify your department is displayed

### **3. Test Role-Based Access**

#### **Create Different User Roles**
1. Sign out
2. Create additional test users with different roles:
   - **Manager**: manager@test.com (role: manager)
   - **Viewer**: viewer@test.com (role: viewer)

#### **Test Role Restrictions**
1. **Administrator**: Should see all menu items including "System Settings" and "User Management"
2. **Manager**: Should see "Team Settings" but not user management
3. **Viewer**: Should see basic user info only

### **4. Test Permission-Based Features**

#### **Task Creation**
- **Administrator/Manager**: Should be able to create tasks
- **Viewer**: Should NOT see add task button or be able to create tasks

#### **Task Editing**
- **Administrator/Manager**: Should be able to edit tasks
- **Viewer**: Should see tasks but not edit buttons

#### **Comments**
- **Administrator/Manager**: Should be able to add/edit comments
- **Viewer**: Should see comments but not add new ones

### **5. Test Security Features**

#### **Row Level Security (RLS)**
1. Try to access data through different user accounts
2. Verify that users can only see data they have permission for
3. Check that role-based restrictions are enforced

#### **Authentication State**
1. Refresh the page - user should remain logged in
2. Sign out - should redirect to auth page
3. Try to access dashboard without auth - should redirect to auth page

### **6. Test Error Handling**

#### **Invalid Credentials**
1. Try logging in with wrong password
2. Verify error message is displayed

#### **Permission Denied**
1. Try to access admin features as a viewer
2. Verify access denied message is shown

### **7. Database Verification**

#### **Check Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Check **Table Editor** → **users** table
3. Verify new users are created with correct roles
4. Check **permissions** table has all role permissions

#### **Check RLS Policies**
1. Go to **Authentication** → **Policies**
2. Verify RLS is enabled on all tables
3. Check that policies are working correctly

## 🐛 **Common Issues & Solutions**

### **"User not found" error**
- Check that the user profile was created in the `users` table
- Verify the migration ran successfully

### **"Permission denied" errors**
- Check that the permissions table has the correct data
- Verify RLS policies are properly configured

### **Authentication not persisting**
- Check browser console for errors
- Verify Supabase environment variables are correct

### **Role not displaying correctly**
- Check that the user's role was saved correctly
- Verify the role enum values match the frontend

## ✅ **Success Criteria**

Your authentication system is working correctly when:

1. ✅ Users can sign up with different roles
2. ✅ Users can sign in and stay authenticated
3. ✅ Role badges display correctly in the header
4. ✅ Role-based menu items appear/disappear appropriately
5. ✅ Permission-based features work correctly
6. ✅ RLS policies enforce access control
7. ✅ Users are redirected appropriately based on auth state
8. ✅ Error handling works for invalid credentials
9. ✅ Access denied messages show for insufficient permissions

## 🚀 **Next Steps**

Once authentication is working:

1. **Integrate with existing components** - Update task creation/editing to use permissions
2. **Add user management** - Create admin interface for managing users
3. **Implement audit logging** - Track user actions for compliance
4. **Add password reset** - Implement forgot password functionality
5. **Add email verification** - Require email confirmation for new accounts
6. **Add session management** - Handle multiple device logins
7. **Add 2FA** - Implement two-factor authentication for admin users

## 🔐 **Security Notes**

- All user passwords are hashed by Supabase Auth
- RLS policies enforce database-level security
- Role-based permissions prevent unauthorized access
- Session tokens are managed securely by Supabase
- No sensitive data is stored in client-side state 