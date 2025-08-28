# Task Assignment System Update

## Overview

The task assignment system has been updated from a single-assignee model to a many-to-many model using the new `task_assignments` table.

## Database Changes

### Removed
- `assigned_to` field from the `tasks` table

### Added
- `task_assignments` table with the following structure:
  - `id` (UUID, primary key)
  - `task_id` (UUID, references tasks.id)
  - `user_id` (UUID, references team_member.id)
  - `assigned_at` (timestamp)
  - `assigned_by` (UUID, references team_member.id)
  - `role` (varchar)

## Code Changes

### 1. Updated Types and Interfaces

- `Task` interface: `assignees` field now contains an array of team member IDs
- `SupabaseTask` interface: `assigned_to` field removed
- New `TaskAssignment` interface for the assignment table
- New `CreateTaskWithAssigneesData` interface for creating tasks with multiple assignees

### 2. New Hook: `useTaskAssignments`

A dedicated hook for managing task assignments:

```typescript
const {
  loading,
  error,
  getTaskAssignments,
  assignUsersToTask,
  updateTaskAssignments,
  removeUserFromTask,
  clearTaskAssignments,
  getTasksForUser,
  clearError,
} = useTaskAssignments()
```

### 3. Updated Task Operations

#### Creating Tasks with Assignments
```typescript
// Create task first, then assign users
const taskData = {
  title: "New Task",
  description: "Task description",
  // ... other fields
  assignees: ["user1-id", "user2-id"] // Array of team member IDs
}

const result = await createTaskWithAssignees(taskData)
```

#### Updating Task Assignments
```typescript
// Update assignments separately from task data
const newAssignees = ["user1-id", "user3-id"]
const success = await updateTaskAssignments(taskId, newAssignees)
```

#### Fetching Task Assignments
```typescript
// Get all assignees for a task
const assigneeIds = await getTaskAssignments(taskId)
```

### 4. UI Components Updated

#### Task Modal
- Multi-select dropdown for team members
- Shows current assignees when editing
- Handles assignment updates separately from task updates

#### Task Card
- Displays multiple assignee avatars (up to 3, with +N indicator)
- Responsive design for different screen sizes

## Usage Examples

### Creating a New Task with Multiple Assignees

```typescript
import { useTaskContext } from '@/contexts/task-context'

const { createTaskWithAssignees } = useTaskContext()

const handleCreateTask = async () => {
  const taskData = {
    title: "Implement new feature",
    description: "Add user authentication system",
    priority: "High" as const,
    status: "Todo" as const,
    department: "Engineering",
    assignees: ["user1-id", "user2-id", "user3-id"]
  }

  const result = await createTaskWithAssignees(taskData)
  if (result) {
    console.log('Task created successfully with assignees')
  }
}
```

### Updating Task Assignments

```typescript
import { useTaskAssignments } from '@/hooks/use-task-assignments'

const { updateTaskAssignments } = useTaskAssignments()

const handleUpdateAssignments = async (taskId: string, newAssignees: string[]) => {
  const success = await updateTaskAssignments(taskId, newAssignees)
  if (success) {
    console.log('Assignments updated successfully')
  }
}
```

### Fetching Tasks with Assignments

```typescript
import { useTasks } from '@/hooks/use-tasks'

const { tasks, fetchTasks } = useTasks()

// Each task now has an assignees array
tasks.forEach(task => {
  console.log(`Task: ${task.title}`)
  console.log(`Assignees: ${task.assignees.join(', ')}`)
})
```

## Migration Notes

### Backward Compatibility
- Existing tasks will show no assignees until manually updated
- The system gracefully handles missing assignment data
- No breaking changes to the UI components

### Performance Considerations
- Assignment data is fetched separately from task data
- Uses efficient database queries with proper indexing
- Real-time updates for assignment changes

### Error Handling
- Assignment failures don't prevent task creation/updates
- Comprehensive error messages for debugging
- Fallback behavior when assignment operations fail

## Database Queries

### Get All Assignments for a Task
```sql
SELECT user_id FROM task_assignments WHERE task_id = $1
```

### Assign Users to a Task
```sql
INSERT INTO task_assignments (task_id, user_id, assigned_at, assigned_by, role)
VALUES ($1, $2, $3, $4, $5)
```

### Update Task Assignments
```sql
-- Remove old assignments
DELETE FROM task_assignments 
WHERE task_id = $1 AND user_id = ANY($2)

-- Add new assignments
INSERT INTO task_assignments (task_id, user_id, assigned_at, assigned_by, role)
VALUES ($1, $2, $3, $4, $5)
```

## Testing

### Manual Testing
1. Create a new task with multiple assignees
2. Edit an existing task and change assignees
3. Verify assignees are displayed correctly in task cards
4. Check that assignment changes persist after page refresh

### Unit Testing
- Test assignment creation, update, and deletion
- Verify error handling for invalid assignments
- Test edge cases (empty assignee lists, invalid user IDs)

## Future Enhancements

### Potential Improvements
- Assignment roles (lead, contributor, reviewer)
- Assignment notifications
- Assignment history tracking
- Bulk assignment operations
- Assignment templates for common scenarios

### Performance Optimizations
- Batch assignment operations
- Caching assignment data
- Optimistic updates for better UX
- Background sync for offline scenarios 