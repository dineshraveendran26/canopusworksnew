# Database Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `canopus-works` (or your preferred name)
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
6. Click "Create new project"
7. Wait for project to be ready (2-3 minutes)

## Step 2: Get Project Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. In your project root, create `.env.local`:
```bash
cp env.example .env.local
```

2. Edit `.env.local` and add your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** to execute the migration

## Step 5: Verify Setup

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `users`
   - `tasks`
   - `subtasks`
   - `comments`
   - `machines`
   - `production_batches`
   - `task_assignments`
   - `attachments`
   - `task_dependencies`
   - `task_history`

3. Check that sample data was inserted:
   - Go to `users` table - should have 4 sample users
   - Go to `tasks` table - should have 3 sample tasks
   - Go to `subtasks` table - should have 5 sample subtasks

## Step 6: Test the Application

1. Start your development server:
```bash
pnpm dev
```

2. Open [http://localhost:3000](http://localhost:3000)
3. You should see the dashboard with sample data

## Troubleshooting

### Common Issues

**"Invalid API key" error**
- Check that your `.env.local` file has the correct values
- Ensure you copied the `anon public` key, not the `service_role` key
- Restart your development server after changing environment variables

**"Table doesn't exist" error**
- Make sure you ran the migration in the correct Supabase project
- Check that the migration completed successfully
- Verify you're connected to the right database

**"Connection refused" error**
- Check your Supabase project URL
- Ensure your project is not paused (free tier projects pause after inactivity)
- Check if there are any IP restrictions in your project settings

### Getting Help

- Check the [Supabase documentation](https://supabase.com/docs)
- Review the migration file for any syntax errors
- Check the Supabase dashboard logs for error messages
- Create an issue in the project repository

## Next Steps

After successful setup:

1. **Customize Data**: Update sample users and tasks with your actual data
2. **Configure Auth**: Set up authentication providers if needed
3. **Set Permissions**: Adjust RLS policies based on your security requirements
4. **Add Features**: Start building additional functionality
5. **Deploy**: Deploy to production when ready

## Security Notes

- Never commit `.env.local` to version control
- Use environment variables for all sensitive configuration
- Regularly rotate your Supabase keys
- Review and customize RLS policies for production use
- Enable MFA on your Supabase account 