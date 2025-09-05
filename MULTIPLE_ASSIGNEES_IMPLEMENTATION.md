# Multiple Assignees Implementation Guide

## 🎯 **Overview**

This document describes the comprehensive solution implemented to fix the multiple assignees issue in the Canopus Works task management system. The solution replaces the single `assigned_to` field with a proper many-to-many relationship between tasks and users.

## 🏗️ **Architecture Changes**

### **Before (Problematic)**
```sql
-- Single assignee field
CREATE TABLE tasks (
  -- ... other fields
  assigned_to UUID REFERENCES users(id),  -- ❌ Only one assignee
  -- ... other fields
);
```

### **After (Solution)**
```sql
-- Main tasks table (simplified)
CREATE TABLE tasks (
  -- ... other fields
  -- assigned_to field kept for backward compatibility
);

-- New junction table for multiple assignees
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  user_id UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES users(id),
  role VARCHAR(50),
  UNIQUE(task_id, user_id)
);

-- View for easy querying
CREATE VIEW tasks_with_assignees AS
SELECT t.*, 
       ARRAY_AGG(ta.user_id) as assignee_ids,
       ARRAY_AGG(u.email) as assignee_emails,
       ARRAY_AGG(u.full_name) as assignee_names
FROM tasks t
LEFT JOIN task_assignments ta ON t.id = ta.task_id
LEFT JOIN users u ON ta.user_id = u.id
GROUP BY t.id, t.title, ...;
```

## 🔄 **Data Flow**

### **1. Task Creation with Multiple Assignees**
```
UI Form → Task Data → createTaskWithAssignees() → 
Database Insert → assign_users_to_task() → 
Task Assignments Created → Success Response
```

### **2. Data Retrieval**
```
Database Query → tasks_with_assignees View → 
Multiple Assignee Data → UI Display
```

## 📁 **Files Modified/Created**

### **Database Migration**
- `supabase/migrations/024_fix_multiple_assignees_support.sql`
  - Creates `task_assignments` table
  - Migrates existing single assignee data
  - Sets up RLS policies
  - Creates helper functions and views

### **TypeScript Interfaces**
- `hooks/use-tasks.ts`
  - Added `TaskAssignment` interface
  - Added `TaskWithAssignees` interface
  - Added `CreateTaskWithAssigneesData` interface

### **New Functions**
- `hooks/use-tasks.ts`
  - `createTaskWithAssignees()` - Proper multiple assignee handling
  - Enhanced error handling and validation

### **UI Components**
- `components/task-modal.tsx`
  - Updated to use `createTaskWithAssignees`
  - Better error messages for multiple assignees

### **Context Updates**
- `contexts/task-context.tsx`
  - Added `createTaskWithAssignees` to context interface

### **Utility Functions**
- `lib/task-mappers.ts`
  - Robust data transformation
  - Better validation and error handling

## 🚀 **How to Apply the Migration**

### **Option 1: Using Supabase CLI (Recommended)**
```bash
# Navigate to your project directory
cd canopus-works

# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up --include-all
```

### **Option 2: Using the Script**
```bash
# Make the script executable
chmod +x scripts/apply-multiple-assignees-migration.js

# Run the migration script
node scripts/apply-multiple-assignees-migration.js
```

### **Option 3: Manual Application**
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `024_fix_multiple_assignees_support.sql`
4. Execute the SQL

## 🧪 **Testing the Implementation**

### **1. Test Task Creation with Multiple Assignees**
```typescript
// In your application
const newTask = await createTaskWithAssignees({
  title: "Test Task with Multiple Assignees",
  description: "Testing the new system",
  assignees: ["user1-id", "user2-id", "user3-id"],
  // ... other fields
});
```

### **2. Verify Database State**
```sql
-- Check that assignments were created
SELECT * FROM task_assignments WHERE task_id = 'your-task-id';

-- Check the view
SELECT * FROM tasks_with_assignees WHERE id = 'your-task-id';
```

### **3. Test Data Retrieval**
```typescript
// The tasks should now include multiple assignee information
const tasks = await fetchTasks();
console.log(tasks[0].assignee_ids); // Should show array of user IDs
```

## 🔒 **Security Features**

### **Row Level Security (RLS)**
- Users can only see assignments for tasks they have access to
- Only task creators and administrators can modify assignments
- Proper isolation between different user contexts

### **Data Validation**
- Prevents removal of last assignee from a task
- Validates user IDs before assignment
- Maintains referential integrity

## 📊 **Performance Considerations**

### **Indexes Created**
```sql
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_assigned_at ON task_assignments(assigned_at);
```

### **View Optimization**
- The `tasks_with_assignees` view aggregates data efficiently
- Uses proper JOINs for optimal query performance
- Handles NULL cases gracefully

## 🔄 **Backward Compatibility**

### **What's Preserved**
- Existing `assigned_to` field remains for compatibility
- All existing task data is preserved
- Existing queries continue to work

### **Migration Strategy**
- New system runs alongside old system
- Gradual migration path available
- No breaking changes to existing functionality

## 🚨 **Known Limitations**

### **Current Implementation**
- The `assigned_to` field is still populated for backward compatibility
- Some edge cases in the migration script may need manual handling
- RLS policies may need adjustment based on your specific requirements

### **Future Improvements**
- Complete removal of `assigned_to` field after full migration
- Enhanced role-based assignment system
- Bulk assignment operations
- Assignment history tracking

## 🆘 **Troubleshooting**

### **Common Issues**

#### **1. Migration Fails**
```bash
# Check Supabase connection
supabase status

# Verify migration file exists
ls -la supabase/migrations/024_fix_multiple_assignees_support.sql
```

#### **2. RLS Policy Errors**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'task_assignments';
```

#### **3. Function Not Found**
```sql
-- Verify function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'assign_users_to_task';
```

### **Debug Commands**
```sql
-- Check table structure
\d task_assignments

-- Check view definition
\d tasks_with_assignees

-- Test function
SELECT assign_users_to_task('task-id', ARRAY['user1-id', 'user2-id']);
```

## 📈 **Monitoring and Maintenance**

### **Regular Checks**
- Monitor assignment creation success rates
- Check for orphaned assignments
- Verify RLS policy effectiveness

### **Performance Monitoring**
```sql
-- Check assignment table size
SELECT COUNT(*) FROM task_assignments;

-- Monitor query performance
EXPLAIN ANALYZE SELECT * FROM tasks_with_assignees LIMIT 10;
```

## 🎉 **Success Metrics**

### **Immediate Benefits**
- ✅ Multiple assignees now work correctly
- ✅ No more data loss when selecting multiple team members
- ✅ Better user experience with proper assignment handling
- ✅ Improved data integrity and validation

### **Long-term Benefits**
- 🚀 Scalable architecture for future enhancements
- 🔒 Better security with proper RLS policies
- 📊 Improved reporting capabilities
- 🛠️ Foundation for advanced assignment features

## 🔮 **Future Roadmap**

### **Phase 2: Enhanced Assignment System**
- Role-based assignments (reviewer, approver, etc.)
- Assignment deadlines and notifications
- Bulk assignment operations
- Assignment templates

### **Phase 3: Advanced Features**
- Assignment analytics and reporting
- Workload balancing
- Skill-based assignment suggestions
- Integration with external systems

---

## 📞 **Support**

If you encounter any issues with this implementation:

1. **Check the logs** in your application console
2. **Verify database state** using the SQL queries above
3. **Review RLS policies** in your Supabase dashboard
4. **Test with simple cases** before complex scenarios

This implementation provides a robust, scalable solution to the multiple assignees problem while maintaining backward compatibility and security. 