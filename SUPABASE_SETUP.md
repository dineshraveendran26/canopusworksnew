# Supabase Setup for Team Members Management

## 🚀 **Quick Setup Guide**

### 1. **Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Wait for the project to be ready

### 2. **Get Your Project Credentials**
1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 3. **Configure Environment Variables**
1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. **Run Database Migration**
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link your project: `supabase link --project-ref your-project-id`
4. Run migration: `supabase db push`

### 5. **Test the Application**
1. Start your dev server: `pnpm dev`
2. Go to the Kanban dashboard
3. Click on user profile → Team Members
4. Try adding, editing, and deleting team members

## 🗄️ **Database Schema**

The migration creates a `team_members` table with:

- **id**: UUID (auto-generated)
- **name**: Full name
- **role**: Job title/position
- **department**: Department name
- **email**: Email address (unique)
- **phone**: Phone number
- **location**: Work location
- **status**: active/away/busy
- **join_date**: Date joined
- **photo_url**: Profile photo URL
- **created_at**: Timestamp
- **updated_at**: Auto-updated timestamp

## 🔐 **Security Features**

- **Row Level Security (RLS)** enabled
- **Authenticated users only** can access team members
- **Real-time subscriptions** for live updates
- **Input validation** and error handling

## 🎯 **Features Implemented**

✅ **Real-time CRUD operations**
✅ **Search and filtering**
✅ **Status management**
✅ **Department organization**
✅ **Live updates across components**
✅ **Consistent data display**
✅ **Error handling with toast notifications**

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"Invalid API key" error**
   - Check your `.env.local` file
   - Ensure keys are copied correctly

2. **"Table doesn't exist" error**
   - Run the migration: `supabase db push`
   - Check Supabase dashboard → Table Editor

3. **"RLS policy violation" error**
   - Ensure you're authenticated
   - Check RLS policies in Supabase dashboard

4. **Real-time not working**
   - Check browser console for errors
   - Verify database triggers are created

## 📱 **Usage Examples**

### **Add Team Member:**
```typescript
const { addTeamMember } = useTeamMembers()

await addTeamMember({
  name: "John Doe",
  role: "Software Engineer",
  department: "Engineering",
  email: "john@company.com",
  phone: "+1-555-0123",
  location: "Office A",
  status: "active",
  joinDate: "2024-01-15"
})
```

### **Search Team Members:**
```typescript
const { searchTeamMembers } = useTeamMembers()

await searchTeamMembers("engineer") // Searches name, role, department
```

### **Filter by Status:**
```typescript
const { filterByStatus } = useTeamMembers()

await filterByStatus("active") // Shows only active members
```

## 🔄 **Real-time Updates**

The system automatically:
- Updates all components when data changes
- Syncs across multiple browser tabs
- Provides instant feedback for CRUD operations
- Maintains data consistency

## 📊 **Performance Features**

- **Indexed queries** for fast searches
- **Pagination support** for large datasets
- **Optimistic updates** for better UX
- **Debounced search** to reduce API calls

---

**Need Help?** Check the Supabase documentation or create an issue in your project repository. 