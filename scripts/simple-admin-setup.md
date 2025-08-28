# Simple Admin User Setup

## Quick Fix Applied ✅
- Fixed the user profile loading error
- Updated RLS policies
- Ensured admin user profile exists in database
- Fixed the `create_user_profile` function

## Next Step: Create Admin Auth Account

### Option 1: Use the Signup Form (Easiest)
1. Go to your app: http://localhost:3000/auth
2. Click "Sign up"
3. Fill in:
   - **Email**: `dineshraveendran26@gmail.com`
   - **Full Name**: `Dinesh Raveendran`
   - **Initials**: `DR`
   - **Role**: `administrator`
   - **Department**: `Management`
   - **Password**: Choose a secure password
4. Submit the form
5. The system will automatically approve this admin account

### Option 2: Manual via Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to Authentication > Users
4. Click "Add User"
5. Enter:
   - **Email**: `dineshraveendran26@gmail.com`
   - **Password**: Choose a secure password
   - **Email Confirm**: Check this box
6. Click "Create User"

## What Happens After Setup
- **Immediate Access**: Full admin privileges
- **Admin Dashboard**: Access to `/admin` route
- **User Management**: Can approve/reject new users
- **All Permissions**: Create, read, update, delete on all resources

## Test the Fix
1. Try logging in with the admin account
2. You should see "Administrator" badge in header
3. Admin button should appear in header
4. Navigate to `/admin` to see the admin dashboard

The error you were seeing should now be resolved! 🎉 