# Authentication System Setup Guide

## Overview
This guide will help you set up the authentication system for Canopus Works Task Management System.

## Prerequisites
- Supabase project created and configured
- Supabase CLI installed and configured
- Node.js and pnpm installed

## Step 1: Environment Variables
Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

You can find these values in your Supabase project dashboard under Settings > API.

## Step 2: Database Setup
The database schema is already defined in the migration files. Run the migrations:

```bash
npx supabase db push
```

## Step 3: Create Admin User
Run the admin user setup script:

```bash
node scripts/setup-admin-user.js
```

This will create the admin user with the following credentials:
- Email: dineshraveendran26@gmail.com
- Password: Welcome123
- Role: Administrator

## Step 4: Test the System
1. Start the development server: `pnpm dev`
2. Navigate to `/login`
3. Sign in with the admin credentials
4. Test user registration and approval workflow

## Features Implemented

### Authentication
- User login with email/password
- User registration with approval workflow
- Role-based access control (Administrator, Manager, Viewer)
- Session management

### User Management
- Admin can approve/reject new user registrations
- Admin can assign roles to approved users
- User profile management

### Permission System
- **Administrator**: Full access to all features including user management
- **Manager**: Task management, no user management access
- **Viewer**: Read-only access to tasks and reports

### User Profile Dropdown
- Display user's full name and email
- Permissions button showing user rights
- Theme toggle (Dark, Light, System)
- Approvals section (admin only)
- Logout functionality

## File Structure
```
├── contexts/
│   └── auth-context.tsx          # Authentication context
├── components/
│   ├── protected-route.tsx       # Route protection component
│   ├── user-profile-dropdown.tsx # User profile dropdown
│   └── header.tsx                # Updated header with auth
├── app/
│   ├── login/
│   │   └── page.tsx              # Login/signup page
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Protected home page
└── scripts/
    └── setup-admin-user.js       # Admin user setup script
```

## Troubleshooting

### Common Issues
1. **Environment variables not set**: Ensure `.env.local` exists with correct values
2. **Database connection failed**: Check Supabase URL and keys
3. **Admin user not created**: Run the setup script with service role key
4. **Migrations failed**: Check Supabase CLI configuration

### Support
If you encounter issues, check the Supabase logs and ensure all environment variables are correctly set. 