# Debugging Authentication Issues

## 🔍 **Current Error Analysis**

You're getting a "new row violates row-level security policy for table 'users'" error. This means:

1. **RLS is enabled** on the users table ✅
2. **Policies are too restrictive** ❌
3. **New users can't create profiles** ❌

## 🛠️ **Immediate Fixes Applied**

### **1. Database Policy Updates**
- ✅ Created permissive policies for user creation
- ✅ Added database functions for profile creation
- ✅ Fixed RLS policy conflicts

### **2. Application Logic Updates**
- ✅ Added fallback profile creation methods
- ✅ Improved error handling
- ✅ Added delays for auth user creation

## 🧪 **Testing Steps**

### **Step 1: Verify Database Connection**
```bash
# Test the connection
node scripts/test-connection.js
```

### **Step 2: Check Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Check **Authentication** → **Users**
3. Verify new auth users are being created
4. Check **Table Editor** → **users** table

### **Step 3: Test User Creation**
1. Try creating a new user again
2. Check browser console for detailed errors
3. Check network tab for API calls

## 🐛 **Common Issues & Solutions**

### **Issue 1: RLS Policy Still Too Restrictive**
**Solution**: The policies might need to be even more permissive for the first user.

### **Issue 2: Auth User Not Fully Created**
**Solution**: The delay might need to be longer, or we need to wait for email confirmation.

### **Issue 3: Permission Denied on Function Call**
**Solution**: The database function might not have proper permissions.

## 🔧 **Manual Database Fix**

If the automatic fixes don't work, you can manually create the first admin user:

### **Option 1: Via Supabase Dashboard**
1. Go to **SQL Editor**
2. Run this query (replace with your actual values):
```sql
INSERT INTO public.users (
  id, email, full_name, initials, role, department, 
  phone, location, join_date, status, avatar_url
) VALUES (
  'your-auth-user-id-here',
  'admin@test.com',
  'Admin User',
  'AU',
  'administrator',
  'Management',
  '+1234567890',
  'Office',
  CURRENT_DATE,
  'active',
  NULL
);
```

### **Option 2: Disable RLS Temporarily**
1. Go to **Table Editor** → **users**
2. Click **Settings** → **RLS**
3. Temporarily disable RLS
4. Create your first user
5. Re-enable RLS

## 📊 **Debug Information to Collect**

### **Browser Console**
- Any JavaScript errors
- Network request failures
- Authentication state changes

### **Supabase Logs**
- Go to **Logs** in your dashboard
- Check for authentication errors
- Look for RLS policy violations

### **Database Queries**
- Check if the `permissions` table has data
- Verify RLS policies are correctly applied
- Check user role assignments

## 🚀 **Alternative Approach**

If the current approach continues to fail, we can implement a different strategy:

### **Strategy 1: Email Confirmation Required**
- Require email confirmation before profile creation
- Create profile only after email is verified

### **Strategy 2: Profile Creation on First Login**
- Create profile when user first signs in
- Use the auth metadata for initial profile data

### **Strategy 3: Admin-Only User Creation**
- First user creates others manually
- Bypass RLS for admin operations

## ✅ **Success Indicators**

Your authentication is working when:

1. ✅ Users can sign up without RLS errors
2. ✅ User profiles are created in the `users` table
3. ✅ Role-based permissions work correctly
4. ✅ Users can sign in and access the dashboard
5. ✅ Role badges display correctly in the header

## 🆘 **Getting Help**

If issues persist:

1. **Check Supabase status**: [status.supabase.com](https://status.supabase.com)
2. **Review RLS policies**: Ensure they're not overly restrictive
3. **Test with simple policies**: Temporarily use basic policies
4. **Check environment variables**: Verify Supabase URL and keys
5. **Review migration order**: Ensure migrations are applied in sequence

## 🔐 **Security Note**

The current approach balances security with usability:
- RLS is enabled for data protection
- Policies allow legitimate user creation
- Fallback methods ensure system functionality
- Admin users have appropriate permissions 