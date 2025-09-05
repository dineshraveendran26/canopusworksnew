# Complete Task and Subtask Assignment System

## 🎯 **System Overview**

This document describes the complete implementation of the many-to-many task and subtask assignment system for Canopus Works. The system now supports:

- **Task-level assignments**: Multiple team members can be assigned to tasks
- **Subtask-level assignments**: Direct assignment or inheritance from parent tasks
- **Assignment inheritance**: Subtasks automatically inherit assignees from parent tasks
- **Many-to-many relationships**: Both tasks and subtasks support multiple assignees
- **Role-based assignments**: Different roles (assignee, reviewer, approver) supported

## 🏗️ **Database Architecture**

### **Core Tables**

#### **1. Tasks Table**
```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'Medium',
  status task_status NOT NULL DEFAULT 'Todo',
  start_date DATE,
  due_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  department VARCHAR(100),
  machine_id UUID REFERENCES public.machines(id),
  batch_id UUID REFERENCES public.production_batches(id),
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_role user_role
);
```

#### **2. Task Assignments Table**
```sql
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.team_member(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.team_member(id),
  role VARCHAR(50) DEFAULT 'assignee',
  UNIQUE(task_id, user_id)
);
```

#### **3. Subtasks Table**
```sql
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **4. Subtask Assignments Table**
```sql
CREATE TABLE public.subtask_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.team_member(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.team_member(id),
  role VARCHAR(50) DEFAULT 'assignee',
  UNIQUE(subtask_id, user_id)
);
```

#### **5. Team Members Table**
```sql
CREATE TABLE public.team_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  position VARCHAR(100),
  employee_id VARCHAR(50) UNIQUE,
  hire_date DATE,
  status VARCHAR(50) DEFAULT 'inactive',
  location VARCHAR(255),
  supervisor_id UUID REFERENCES public.users(id),
  avatar_url TEXT,
  skills TEXT[],
  certifications TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES public.users(id)
);
```

### **Views and Functions**

#### **1. Tasks with Assignees View**
```sql
CREATE VIEW public.tasks_with_assignees AS
SELECT 
  t.*,
  ARRAY_AGG(ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL) as assignee_ids,
  ARRAY_AGG(tm.email) FILTER (WHERE tm.email IS NOT NULL) as assignee_emails,
  ARRAY_AGG(tm.full_name) FILTER (WHERE tm.full_name IS NOT NULL) as assignee_names
FROM public.tasks t
LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
LEFT JOIN public.team_member tm ON ta.user_id = tm.id
GROUP BY t.id, t.title, t.description, t.priority, t.status, t.start_date, t.due_date,
         t.estimated_hours, t.actual_hours, t.created_by, t.department, t.machine_id,
         t.batch_id, t.quality_score, t.created_at, t.updated_at, t.completed_at, t.user_role;
```

#### **2. Subtasks with Assignees View**
```sql
CREATE VIEW public.subtasks_with_assignees AS
SELECT 
  s.*,
  ARRAY_AGG(sa.user_id) FILTER (WHERE sa.user_id IS NOT NULL) as assignee_ids,
  ARRAY_AGG(tm.email) FILTER (WHERE tm.email IS NOT NULL) as assignee_emails,
  ARRAY_AGG(tm.full_name) FILTER (WHERE tm.full_name IS NOT NULL) as assignee_names
FROM public.subtasks s
LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
LEFT JOIN public.team_member tm ON sa.user_id = tm.id
GROUP BY s.id, s.task_id, s.title, s.description, s.completed, s.order_index,
         s.estimated_hours, s.actual_hours, s.completed_at, s.created_at, s.updated_at;
```

#### **3. Comprehensive Task View**
```sql
CREATE VIEW public.tasks_with_full_details AS
SELECT 
  t.*,
  -- Task assignees
  ARRAY_AGG(DISTINCT ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL) as task_assignee_ids,
  ARRAY_AGG(DISTINCT tm.email) FILTER (WHERE tm.email IS NOT NULL) as task_assignee_emails,
  ARRAY_AGG(DISTINCT tm.full_name) FILTER (WHERE tm.email IS NOT NULL) as task_assignee_names,
  -- Subtasks with their assignees
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', s.id,
      'title', s.title,
      'description', s.description,
      'completed', s.completed,
      'order_index', s.order_index,
      'assignee_ids', ARRAY_AGG(DISTINCT sa.user_id) FILTER (WHERE sa.user_id IS NOT NULL),
      'assignee_names', ARRAY_AGG(DISTINCT stm.full_name) FILTER (WHERE stm.full_name IS NOT NULL)
    ) ORDER BY s.order_index
  ) FILTER (WHERE s.id IS NOT NULL) as subtasks_with_assignees
FROM public.tasks t
LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
LEFT JOIN public.team_member tm ON ta.user_id = tm.id
LEFT JOIN public.subtasks s ON t.id = s.task_id
LEFT JOIN public.subtask_assignments sa ON s.id = sa.subtask_id
LEFT JOIN public.team_member stm ON sa.user_id = stm.id
GROUP BY t.id, t.title, t.description, t.priority, t.status, t.start_date, t.due_date,
         t.estimated_hours, t.actual_hours, t.created_by, t.department, t.machine_id,
         t.batch_id, t.quality_score, t.created_at, t.updated_at, t.completed_at, t.user_role;
```

## 🔄 **Assignment Logic**

### **1. Task Assignment**
- Tasks can have multiple assignees
- Each assignment includes role information (assignee, reviewer, approver)
- Assignments are stored in `task_assignments` table

### **2. Subtask Assignment**
- **Explicit Assignment**: Direct assignment to specific team members
- **Inherited Assignment**: Automatic assignment from parent task
- **Priority**: Explicit assignments override inherited ones

### **3. Inheritance Rules**
```
IF subtask has explicit assignees:
  Use explicit assignees
ELSE IF parent task has assignees:
  Inherit from parent task
ELSE:
  No assignees (requires manual assignment)
```

## 🛠️ **Core Functions**

### **1. Assign Users to Task**
```sql
SELECT public.assign_users_to_task(
  p_task_id UUID,
  p_user_ids UUID[],
  p_assigned_by UUID DEFAULT NULL
);
```

### **2. Assign Users to Subtask**
```sql
SELECT public.assign_users_to_subtask(
  p_subtask_id UUID,
  p_user_ids UUID[],
  p_assigned_by UUID DEFAULT NULL
);
```

### **3. Get Effective Subtask Assignees**
```sql
SELECT * FROM public.get_effective_subtask_assignees(p_subtask_id UUID);
```

### **4. Bulk Assign Subtasks**
```sql
SELECT public.bulk_assign_subtasks_to_user(
  p_subtask_ids UUID[],
  p_user_id UUID,
  p_assigned_by UUID DEFAULT NULL
);
```

### **5. Sync Subtask Assignments**
```sql
SELECT public.sync_subtask_assignments_with_task(p_task_id UUID);
```

### **6. Validate Assignment Consistency**
```sql
SELECT * FROM public.validate_assignment_consistency();
```

### **7. Fix Assignment Inconsistencies**
```sql
SELECT public.fix_assignment_inconsistencies();
```

## 📊 **Data Flow Examples**

### **Example 1: Task Creation with Multiple Assignees**
```typescript
// 1. Create task
const task = await supabase
  .from('tasks')
  .insert({
    title: 'Implement User Authentication',
    description: 'Add secure user authentication system',
    priority: 'High',
    status: 'Todo',
    department: 'Engineering',
    created_by: currentUserId
  })
  .select()
  .single();

// 2. Assign multiple users
const assignments = [
  { task_id: task.id, user_id: 'user1-id', role: 'assignee' },
  { task_id: task.id, user_id: 'user2-id', role: 'reviewer' },
  { task_id: task.id, user_id: 'user3-id', role: 'approver' }
];

await supabase
  .from('task_assignments')
  .insert(assignments);
```

### **Example 2: Subtask with Explicit Assignment**
```typescript
// 1. Create subtask
const subtask = await supabase
  .from('subtasks')
  .insert({
    task_id: taskId,
    title: 'Design Database Schema',
    description: 'Create user authentication database schema',
    order_index: 1
  })
  .select()
  .single();

// 2. Assign specific user (overrides inheritance)
await supabase
  .from('subtask_assignments')
  .insert({
    subtask_id: subtask.id,
    user_id: 'designer-user-id',
    role: 'assignee'
  });
```

### **Example 3: Subtask with Inherited Assignment**
```typescript
// Subtask automatically inherits assignees from parent task
// No explicit assignment needed

const subtask = await supabase
  .from('subtasks')
  .insert({
    task_id: taskId,
    title: 'Write Unit Tests',
    description: 'Create comprehensive test coverage',
    order_index: 2
  })
  .select()
  .single();

// Assignees are automatically inherited from parent task
// No additional assignment code needed
```

## 🔍 **Querying Examples**

### **Get Task with All Assignments**
```sql
SELECT * FROM public.get_task_with_all_assignments('task-uuid-here');
```

### **Get Tasks with Full Details**
```sql
SELECT * FROM public.tasks_with_full_details WHERE id = 'task-uuid-here';
```

### **Get Subtasks with Assignees**
```sql
SELECT * FROM public.subtasks_with_assignees WHERE task_id = 'task-uuid-here';
```

### **Assignment Summary Dashboard**
```sql
SELECT * FROM public.assignment_summary ORDER BY created_at DESC;
```

## 🚀 **Frontend Integration**

### **1. Task Creation Hook**
```typescript
const { createTaskWithAssignees } = useTaskContext();

const handleCreateTask = async (taskData: CreateTaskData) => {
  const result = await createTaskWithAssignees({
    ...taskData,
    assignees: selectedAssigneeIds
  });
};
```

### **2. Subtask Assignment Hook**
```typescript
const { assignUsersToSubtask, getEffectiveSubtaskAssignees } = useSubtaskAssignments();

const handleAssignSubtask = async (subtaskId: string, userIds: string[]) => {
  await assignUsersToSubtask(subtaskId, userIds);
};

const getAssignees = async (subtaskId: string) => {
  const assignees = await getEffectiveSubtaskAssignees(subtaskId);
  return assignees;
};
```

### **3. Assignment Display Component**
```typescript
const TaskAssignees = ({ taskId, subtaskId }) => {
  const [assignees, setAssignees] = useState([]);
  
  useEffect(() => {
    if (subtaskId) {
      // Get subtask assignees (explicit + inherited)
      getEffectiveSubtaskAssignees(subtaskId).then(setAssignees);
    } else {
      // Get task assignees
      getTaskAssignees(taskId).then(setAssignees);
    }
  }, [taskId, subtaskId]);
  
  return (
    <div className="assignees">
      {assignees.map(assignee => (
        <AssigneeBadge 
          key={assignee.user_id} 
          assignee={assignee}
          type={assignee.assignment_type}
        />
      ))}
    </div>
  );
};
```

## 🧪 **Testing**

### **Run Complete System Test**
```bash
node scripts/test-complete-assignment-system.js
```

### **Test Individual Components**
```bash
# Test task assignments
node scripts/test-new-assignment-system.js

# Test database consistency
psql -d your_database -c "SELECT * FROM public.validate_assignment_consistency();"
```

## 📋 **Migration Summary**

### **Migration 025: Add Subtask Assignments**
- ✅ Creates `subtask_assignments` table
- ✅ Adds assignment support to subtasks
- ✅ Implements inheritance logic
- ✅ Creates helper functions and views
- ✅ Sets up RLS policies

### **Migration 026: Cleanup and Consistency**
- ✅ Removes old `assigned_to` fields
- ✅ Updates views for consistency
- ✅ Creates comprehensive reporting views
- ✅ Adds validation and maintenance functions

## 🔒 **Security Features**

### **Row Level Security (RLS)**
- All assignment tables have RLS enabled
- Users can only see assignments for accessible tasks/subtasks
- Assignment creation/updates require proper permissions
- Administrator role has full access

### **Data Validation**
- Prevents orphaned assignments
- Ensures assignment consistency
- Validates user permissions before operations
- Maintains referential integrity

## 📈 **Performance Considerations**

### **Indexes**
- Primary keys on all tables
- Foreign key indexes for joins
- Assignment date indexes for sorting
- Composite indexes for common queries

### **Views**
- Pre-computed aggregations
- Optimized for common query patterns
- JSON aggregation for complex data structures
- Efficient filtering and sorting

## 🚨 **Error Handling**

### **Common Issues**
1. **No Assignees**: Tasks/subtasks without assignees
2. **Orphaned Assignments**: References to deleted tasks/subtasks
3. **Permission Denied**: Insufficient access rights
4. **Data Inconsistency**: Mismatched assignment data

### **Resolution Functions**
- `validate_assignment_consistency()`: Identifies issues
- `fix_assignment_inconsistencies()`: Automatically fixes common problems
- `sync_subtask_assignments_with_task()`: Syncs inheritance
- Manual cleanup for complex issues

## 🔮 **Future Enhancements**

### **Planned Features**
- Assignment notifications and alerts
- Assignment history tracking
- Assignment templates and presets
- Bulk assignment operations
- Assignment analytics and reporting

### **Performance Optimizations**
- Assignment caching layer
- Background sync processes
- Optimistic updates for better UX
- Real-time assignment updates

## 📚 **Additional Resources**

- **API Documentation**: See individual function comments
- **Test Scripts**: `scripts/test-complete-assignment-system.js`
- **Migration Files**: `supabase/migrations/025_*` and `026_*`
- **UI Components**: See `components/` directory for implementation examples

---

This system provides a robust, scalable foundation for managing complex task and subtask assignments with proper inheritance, validation, and performance optimization. 