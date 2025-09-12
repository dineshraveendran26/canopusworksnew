# Admin User Setup Guide

## Current Status
✅ Database schema updated with user approval system
✅ Admin user `dineshraveendran26@gmail.com` configured in database with full permissions
✅ All necessary permissions and RLS policies created

## Next Steps to Complete Admin Setup

### Option 1: Create Admin Account via Signup Form (Recommended)
1. Go to `/auth` page in your app
2. Click "Sign up" 
3. Fill in the form with:
   - **Email**: `dineshraveendran26@gmail.com`
   - **Full Name**: `Dinesh Raveendran`
   - **Initials**: `DR`
   - **Role**: `administrator`
   - **Department**: `Management`
   - **Password**: Choose a secure password
4. Submit the form
5. The system will automatically approve this account since the email matches the pre-configured admin

### Option 2: Create Admin Account via Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to Authentication > Users
4. Click "Add User"
5. Enter:
   - **Email**: `dineshraveendran26@gmail.com`
   - **Password**: Choose a secure password
   - **Email Confirm**: Check this box
6. Click "Create User"

### Option 3: Use Supabase CLI (Advanced)
```bash
# Create user via CLI
npx supabase auth admin create-user \
  --email dineshraveendran26@gmail.com \
  --password YOUR_SECURE_PASSWORD \
  --email-confirm
```

## What Happens After Setup

1. **Immediate Access**: The admin user will have full access to all features
2. **Admin Dashboard**: Access to `/admin` route to manage user approvals
3. **User Management**: Can approve/reject new user registrations
4. **Full Permissions**: Create, read, update, delete on all resources

## Testing the Setup

1. **Login**: Use the admin credentials to sign in
2. **Check Role**: Should see "Administrator" badge in header
3. **Admin Link**: Should see "Admin" button in header
4. **Admin Page**: Navigate to `/admin` to see the admin dashboard
5. **User Approvals**: New user registrations will appear here for review

## Troubleshooting

### If login fails:
- Check that the user exists in Supabase Auth
- Verify the password is correct
- Ensure the user profile exists in the `public.users` table

### If admin features don't work:
- Check that the user has `role = 'administrator'` in `public.users`
- Verify `approval_status = 'approved'`
- Check that permissions exist in `public.permissions` table

### If RLS blocks access:
- Verify the RLS policies are correctly applied
- Check that the user's role and approval status are correct
- Ensure the `check_user_permission` function works correctly

## Security Notes

- The admin user has full system access
- Can manage all users, tasks, and system settings
- Should use a strong, unique password
- Consider enabling 2FA for additional security 