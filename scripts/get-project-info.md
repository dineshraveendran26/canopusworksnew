# Get Your Supabase Project Information

## Step 1: Access Your Supabase Dashboard

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Click on your "canopus-works" project

## Step 2: Get Project URL and API Keys

1. In your project dashboard, go to **Settings** → **API**
2. You'll see:
   - **Project URL**: `https://xnxoyjodbjfcwqmsdfcp.supabase.co`
   - **anon public** key: Starts with `eyJ...`

## Step 3: Update Your Environment Variables

1. In your project root, edit `.env.local`:
```bash
nano .env.local
# or
code .env.local
```

2. Replace the placeholder values with your actual credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xnxoyjodbjfcwqmsdfcp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

3. Save the file

## Step 4: Test the Connection

1. Start your development server:
```bash
pnpm dev
```

2. Open [http://localhost:3000](http://localhost:3000)
3. Check the browser console for any connection errors

## Step 5: Verify Database Tables

1. In your Supabase dashboard, go to **Table Editor**
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

## Step 6: Check Sample Data

1. Go to the `machines` table
2. You should see 3 sample machines:
   - Production Line A
   - Quality Scanner
   - Maintenance Cart

3. Go to the `production_batches` table
4. You should see 1 sample batch:
   - BATCH-2024-001 (Premium Widget)

## Troubleshooting

### "Invalid API key" error
- Double-check your anon key (not the service_role key)
- Ensure no extra spaces or characters
- Restart your development server

### "Connection refused" error
- Verify your project URL is correct
- Check if your project is paused (free tier projects pause after inactivity)
- Ensure no IP restrictions in project settings

### Tables not visible
- Go to **SQL Editor** and check if the migration ran successfully
- Look for any error messages in the migration output

## Next Steps

Once everything is working:
1. **Create your first user** through the Supabase Auth system
2. **Test creating tasks** in your application
3. **Customize the data** for your manufacturing workflow
4. **Set up authentication** if needed

## Security Note

- Never commit `.env.local` to version control
- Keep your API keys secure
- Use environment variables in production deployments 