"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from '@/contexts/auth-context'
import { 
  mapUITaskToDatabase, 
  validateRequiredFields, 
  normaliseDateToYMD,
  mapStatusToDb,
  mapPriorityToDb 
} from '@/lib/task-mappers'

// Task types matching the current UI structure but mapped to Supabase schema
export interface Task {
  id: string
  title: string
  description?: string
  priority: "Low" | "Medium" | "High" | "Critical"
  status: "Todo" | "In Progress" | "Completed"
  startDate?: string
  dueDate?: string
  assignees: string[] // Array of team member IDs
  subtasks: any[]
  comments: any[]
  department?: string
  attachments?: any[] // Add attachments field
  documentLinks?: string[] // Add document links for database storage
}

// Supabase task interface for database operations
export interface SupabaseTask {
  id: string
  title: string
  description?: string
  priority: "Low" | "Medium" | "High" | "Critical"
  status: "Todo" | "In Progress" | "Completed"
  start_date?: string
  due_date?: string
  created_by: string
  department?: string
  document_links?: string[] // For attachments
  created_at: string
  updated_at: string
  completed_at?: string
}

// New interface for task assignments
export interface TaskAssignment {
  id: string
  task_id: string
  user_id: string
  assigned_at: string
  assigned_by?: string
  role: string
  user?: {
    email: string
    full_name?: string
  }
}

// Enhanced task interface with multiple assignees
export interface TaskWithAssignees extends SupabaseTask {
  assignee_ids: string[]
  assignee_emails: string[]
  assignee_names: string[]
  assignments?: TaskAssignment[]
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  order_index: number
  startDate?: Date
  endDate?: Date
  document_links?: string[] // For attachments
  completed_at?: string
  created_at: string
  updated_at: string
  assignees: string[] // Array of team member IDs
}

export interface Comment {
  id: string
  task_id?: string
  subtask_id?: string
  author_id: string
  content: string
  is_internal: boolean
  created_at: string
  updated_at: string
}

export interface CreateTaskData {
  title: string
  description?: string
  priority: "Low" | "Medium" | "High" | "Critical"
  status: "Todo" | "In Progress" | "Completed"
  start_date?: string
  due_date?: string
  created_by: string
  department?: string | null
  document_links?: string[] // For attachments
}

// New interface for creating tasks with multiple assignees
export interface CreateTaskWithAssigneesData extends Omit<CreateTaskData, 'assigned_to'> {
  assignee_ids: string[]
}

export interface CreateSubtaskData {
  task_id: string
  title: string
  order_index: number
  start_date?: string | null
  end_date?: string | null
  completed?: boolean
  created_by?: string
}

export interface CreateCommentData {
  task_id?: string
  subtask_id?: string
  author_id: string
  content: string
  is_internal?: boolean
}

export function useTasks() {
  console.log('🔄 useTasks START - Hook initialized')
  
  const { user } = useAuth()
  console.log('🔄 useTasks - useAuth result:', { user: !!user, userId: user?.id, userEmail: user?.email })
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  console.log('🔄 useTasks - State initialized:', { tasksCount: tasks.length, loading, error })

  // Convert Supabase task to UI task format
  const convertSupabaseToUITask = (supabaseTask: any): Task => {
    // Get subtasks for this task from the subtasks state
    const taskSubtasks = subtasks.filter((st: Subtask) => st.task_id === supabaseTask.id)
    
    // Convert document_links to attachments format for UI
    const attachments = (supabaseTask.document_links || []).map((link: string, index: number) => ({
      id: `attachment-${index}`,
      description: `Document ${index + 1}`,
      link: link,
      createdAt: supabaseTask.created_at || new Date().toISOString()
    }))
    
    return {
      id: supabaseTask.id,
      title: supabaseTask.title,
      description: supabaseTask.description,
      priority: supabaseTask.priority,
      status: supabaseTask.status,
      startDate: supabaseTask.start_date,
      dueDate: supabaseTask.due_date,
      assignees: [], // Will be populated separately via fetchTaskAssignments
      subtasks: taskSubtasks.map((subtask: Subtask) => ({
        ...subtask,
        startDate: subtask.startDate || undefined,
        endDate: subtask.endDate || undefined,
        assignees: subtask.assignees || [] // Ensure assignees array exists
      })), // Include actual subtasks with assignees
      comments: [], // Will be populated separately
      department: supabaseTask.department,
      attachments: attachments,
      documentLinks: supabaseTask.document_links || []
    }
  }

  // Check database schema to see what columns exist
  const checkDatabaseSchema = async () => {
    try {
      console.log('🔄 Checking database schema...')
      
      // Try to get the table info
      const { data: tableInfo, error: tableError } = await supabase
        .from('tasks')
        .select('*')
        .limit(0)
      
      if (tableError) {
        console.error('❌ Error checking table schema:', tableError)
        return
      }
      
      console.log('✅ Table schema check successful')
      console.log('🔄 Table info:', tableInfo)
      
    } catch (error) {
      console.error('❌ Error in checkDatabaseSchema:', error)
    }
  }

  // Check schema when hook initializes
  useEffect(() => {
    if (user) {
      checkDatabaseSchema()
    }
  }, [user])

  // Convert UI task to Supabase format using improved utilities
  const convertUIToSupabaseTask = (uiTask: Omit<Task, "id">): CreateTaskData => {
    console.log('🔄 convertUIToSupabaseTask called with:', uiTask)
    
    if (!user) {
      console.error('❌ No user in convertUIToSupabaseTask')
      throw new Error('User must be authenticated to create tasks')
    }
    
    console.log('🔄 Converting UI task to Supabase format using new utilities...')
    
    // Validate required fields first
    const requiredFields = ['title'];
    const missingFields = validateRequiredFields(uiTask, requiredFields);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Use the new mapping utility for robust data transformation
    const mappedData = mapUITaskToDatabase({
      title: uiTask.title,
      description: uiTask.description,
      status: uiTask.status,
      priority: uiTask.priority,
      startDate: uiTask.startDate,
      dueDate: uiTask.dueDate,
      assignees: uiTask.assignees,
      department: uiTask.department,
      created_by: user.id,
      documentLinks: uiTask.documentLinks || [] // Pass document links
    });
    
    console.log('🔄 Mapped data using utilities:', mappedData);
    
    // Convert to CreateTaskData format
    const supabaseTaskData: CreateTaskData = {
      title: mappedData.title || '',
      description: mappedData.description || undefined,
      priority: (mappedData.priority as any) || 'Medium',
      status: (mappedData.status as any) || 'Todo',
      start_date: mappedData.start_date || undefined,
      due_date: mappedData.due_date || undefined,
      created_by: mappedData.created_by || '',
      department: mappedData.department || null,
      document_links: mappedData.document_links || undefined
    };
    
    console.log('🔄 Final supabaseTaskData:', supabaseTaskData);
    console.log('🔄 Final supabaseTaskData keys:', Object.keys(supabaseTaskData));
    
    return supabaseTaskData;
  }

  // New function to create task with proper multiple assignee support
  const createTaskWithAssignees = async (uiTask: Omit<Task, "id">): Promise<Task | null> => {
    console.log('🚀 createTaskWithAssignees called with:', uiTask)
    
    if (!user) {
      console.error('❌ No user in createTaskWithAssignees')
      setError('User must be authenticated to create tasks')
      return null
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // Convert UI task to database format
      const taskData = convertUIToSupabaseTask(uiTask)
      
      // Create the task first
      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ Error creating task:', insertError)
        setError(`Failed to create task: ${insertError.message}`)
        return null
      }
      
      // Now handle multiple assignees using the new assignment system
      if (uiTask.assignees && uiTask.assignees.length > 0) {
        console.log('🔄 Assigning users to task:', uiTask.assignees)
        
        // Create assignments in the task_assignments table
        const assignments = uiTask.assignees.map(userId => ({
          task_id: newTask.id,
          team_member_id: userId, // Changed from user_id to team_member_id
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
          role: 'assignee'
        }))
        
        const { error: assignmentError } = await supabase
          .from('task_assignments')
          .insert(assignments)
        
        if (assignmentError) {
          console.error('❌ Error assigning users to task:', assignmentError)
          // Don't fail the entire operation, just log the error
          console.warn('⚠️ Task created but user assignment failed')
        } else {
          console.log('✅ Successfully assigned users to task')
        }
      }
      
      // Now handle subtasks if they exist
      if (uiTask.subtasks && uiTask.subtasks.length > 0) {
        console.log('🔄 Creating subtasks for task:', uiTask.subtasks.length, 'subtasks')
        
        try {
          const subtaskPromises = uiTask.subtasks.map(async (subtask, index) => {
            const subtaskData: CreateSubtaskData = {
              task_id: newTask.id,
              title: subtask.title,
              order_index: index,
              start_date: subtask.startDate ? subtask.startDate.toISOString().split('T')[0] : null,
              end_date: subtask.endDate ? subtask.endDate.toISOString().split('T')[0] : null,
              completed: subtask.completed || false,
              created_by: user.id
            }
            
            console.log('🔄 Creating subtask:', subtaskData)
            
            const { data: newSubtask, error: subtaskError } = await supabase
              .from('subtasks')
              .insert(subtaskData)
              .select()
              .single()
            
            if (subtaskError) {
              console.error('❌ Error creating subtask:', subtaskError)
              throw subtaskError
            }
            
            console.log('✅ Subtask created:', newSubtask)
            return newSubtask
          })
          
          await Promise.all(subtaskPromises)
          console.log('✅ All subtasks created successfully')
          
        } catch (subtaskError) {
          console.error('❌ Error creating subtasks:', subtaskError)
          // Don't fail the entire operation, just log the error
          console.warn('⚠️ Task created but subtask creation failed')
        }
      }
      
      // Convert back to UI format and add to state
      const uiTaskData = convertSupabaseToUITask(newTask)
      // Note: Task will be added to state via real-time subscription to prevent duplicates
      // setTasks(prev => [uiTaskData, ...prev]) // Removed to prevent duplicates
      
      console.log('✅ Task created successfully with assignees and subtasks')
      return uiTaskData
      
    } catch (error) {
      console.error('❌ Unexpected error in createTaskWithAssignees:', error)
      setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      if (!user) {
        console.log('⚠️ User not authenticated, skipping task fetch')
        setTasks([])
        setLoading(false)
        return
      }

      console.log('🔄 Fetching tasks for user:', user.id)

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('❌ Error fetching tasks:', fetchError)
        setError(fetchError.message)
        return
      }

      console.log('✅ Tasks fetched successfully:', data?.length || 0, 'tasks')

      // Convert Supabase tasks to UI format
      const uiTasks = (data || []).map(convertSupabaseToUITask)
      console.log('🔄 Fetched tasks from database:', uiTasks.length, 'tasks')
      console.log('🔄 Task IDs:', uiTasks.map(t => t.id))
      setTasks(uiTasks)

      // Fetch subtasks and assignments for all tasks
      if (data && data.length > 0) {
        console.log('🔄 Fetching subtasks and assignments for all tasks...')
        for (const task of data) {
          await Promise.all([
            fetchSubtasks(task.id),
            fetchTaskAssignments(task.id).then(assigneeIds => {
              // Update the task with its assignees
              setTasks(prev => prev.map((t: Task) => 
                t.id === task.id ? { ...t, assignees: assigneeIds } : t
              ))
            })
          ])
        }
      }
    } catch (err) {
      console.error('❌ Error in fetchTasks:', err)
      setError('Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  // Fetch subtasks for a specific task with assignees
  const fetchSubtasks = async (taskId: string) => {
    try {
      // First fetch subtasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('order_index', { ascending: true })

      if (subtasksError) {
        console.error('Error fetching subtasks:', subtasksError)
        return
      }

      // Then fetch assignees for each subtask
      const subtasksWithAssignees = await Promise.all(
        (subtasksData || []).map(async (subtask) => {
          const { data: assigneesData, error: assigneesError } = await supabase
            .from('subtask_assignments')
            .select('team_member_id') // Changed from user_id to team_member_id

          if (assigneesError) {
            console.warn('Error fetching subtask assignees:', assigneesError)
            return { ...subtask, assignees: [] }
          }

          return {
            ...subtask,
            startDate: subtask.start_date ? new Date(subtask.start_date) : undefined,
            endDate: subtask.end_date ? new Date(subtask.end_date) : undefined,
            assignees: assigneesData?.map((a: { team_member_id: string }) => a.team_member_id) || []
          }
        })
      )

      setSubtasks(prev => {
        const filtered = prev.filter(subtask => subtask.task_id !== taskId)
        return [...filtered, ...subtasksWithAssignees]
      })
    } catch (err) {
      console.error('Error in fetchSubtasks:', err)
    }
  }

  // Fetch task assignments for a specific task
  const fetchTaskAssignments = async (taskId: string): Promise<string[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('task_assignments')
        .select('team_member_id')  // Changed from user_id to match database schema

      if (fetchError) {
        console.error('Error fetching task assignments:', fetchError)
        return []
      }

      return data?.map((assignment: { team_member_id: string }) => assignment.team_member_id) || []  // Changed from user_id
    } catch (err) {
      console.error('Error in fetchTaskAssignments:', err)
      return []
    }
  }

  // Fetch comments for a specific task or subtask
  const fetchComments = async (taskId?: string, subtaskId?: string) => {
    try {
      let query = supabase.from('comments').select('*')
      
      if (taskId) {
        query = query.eq('task_id', taskId)
      } else if (subtaskId) {
        query = query.eq('subtask_id', subtaskId)
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: true })

      if (fetchError) {
        console.error('Error fetching comments:', fetchError)
        return
      }

      setComments(prev => {
        const filtered = prev.filter(comment => 
          comment.task_id !== taskId && comment.subtask_id !== subtaskId
        )
        return [...filtered, ...(data || [])]
      })
    } catch (err) {
      console.error('Error in fetchComments:', err)
    }
  }

  // Add a new task
  const addTask = async (taskData: Omit<Task, "id">): Promise<Task | null> => {
    try {
      console.log('🔄 addTask called with:', taskData)
      console.log('🔄 taskData type:', typeof taskData)
      console.log('🔄 taskData keys:', Object.keys(taskData))
      console.log('🔄 taskData.title:', taskData.title)
      console.log('🔄 taskData.description:', taskData.description)
      console.log('🔄 taskData.status:', taskData.status)
      console.log('🔄 taskData.priority:', taskData.priority)
      console.log('🔄 taskData.department:', taskData.department)
      console.log('🔄 taskData.assignees:', taskData.assignees)
      
      // Check authentication status
      console.log('🔄 Checking authentication...')
      console.log('🔄 user object:', user)
      console.log('🔄 user.id:', user?.id)
      console.log('🔄 user.email:', user?.email)
      
      if (!user) {
        console.error('❌ No authenticated user found')
        setError('You must be logged in to create tasks')
        return null
      }
      
      // Check Supabase session
      console.log('🔄 Checking Supabase session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔄 Session data:', session)
      console.log('🔄 Session error:', sessionError)
      
      if (!session) {
        console.error('❌ No Supabase session found')
        setError('No active session found')
        return null
      }
      
      // Validate required fields using utility function
      const requiredFields = ['title'];
      const missingFields = validateRequiredFields(taskData, requiredFields);
      
      if (missingFields.length > 0) {
        const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
        console.error('❌', errorMessage);
        setError(errorMessage);
        return null;
      }
      
      setError(null)

      // Convert UI task to Supabase format
      console.log('🔄 About to call convertUIToSupabaseTask...')
      console.log('🔄 Input to convertUIToSupabaseTask:', taskData)
      
      const supabaseTaskData = convertUIToSupabaseTask(taskData)
      console.log('🔄 Converted to Supabase format:', supabaseTaskData)
      console.log('🔄 supabaseTaskData type:', typeof supabaseTaskData)
      console.log('🔄 supabaseTaskData keys:', Object.keys(supabaseTaskData))
      console.log('🔄 supabaseTaskData.title:', supabaseTaskData.title)
      console.log('🔄 supabaseTaskData.created_by:', supabaseTaskData.created_by)
      
      // Validate converted data
      if (!supabaseTaskData.title || supabaseTaskData.title.trim() === '') {
        console.error('❌ Converted task data is invalid:', supabaseTaskData)
        setError('Invalid task data')
        return null
      }

      console.log('🔄 About to insert into Supabase...')
      console.log('🔄 Inserting data:', JSON.stringify(supabaseTaskData, null, 2))
      console.log('🔄 Data type:', typeof supabaseTaskData)
      console.log('🔄 Data keys:', Object.keys(supabaseTaskData))
      console.log('🔄 Data values:', Object.values(supabaseTaskData))

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert([supabaseTaskData])
        .select('id, title, description, priority, status, start_date, due_date, created_by, department, created_at, updated_at')
        .single()

      if (insertError) {
        console.error('❌ Error adding task:', insertError)
        console.error('❌ Error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        })
        console.error('❌ Data that failed to insert:', supabaseTaskData)
        
        // Enhanced error handling with better messages
        let errorMessage = 'Failed to create task';
        let errorDetails = '';
        
        switch (insertError.code) {
          case '23505':
            errorMessage = 'A task with this title already exists';
            break;
          case '23503':
            errorMessage = 'Invalid reference (user, machine, or batch not found)';
            errorDetails = insertError.details || 'Check that all referenced IDs exist';
            break;
          case '23502':
            errorMessage = 'Missing required field';
            errorDetails = insertError.details || 'Check that all required fields are provided';
            break;
          case '42P01':
            errorMessage = 'Database table not found';
            errorDetails = 'The tasks table may not exist or be accessible';
            break;
          case '42501':
            errorMessage = 'Permission denied';
            errorDetails = 'You may not have permission to create tasks';
            break;
          default:
            if (insertError.message) {
              errorMessage = insertError.message;
            }
            if (insertError.hint) {
              errorDetails = insertError.hint;
            }
        }
        
        const fullErrorMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
        console.error('❌ Enhanced error message:', fullErrorMessage);
        setError(fullErrorMessage);
        return null;
      }

      console.log('✅ Task inserted successfully:', data)

      // Convert back to UI format and add to state
      const newUITask = convertSupabaseToUITask(data)
      console.log('🔄 Converted back to UI format:', newUITask)
      
      setTasks(prev => [newUITask, ...prev])
      console.log('✅ Task added to local state')
      
      return newUITask
    } catch (err) {
      console.error('❌ Error in addTask:', err)
      setError('Failed to add task')
      return null
    }
  }

  // Update an existing task
  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task | null> => {
    try {
      setError(null)

      // Convert UI updates to Supabase format
      const supabaseUpdates: Partial<SupabaseTask> = {}
      if (updates.title !== undefined) supabaseUpdates.title = updates.title
      if (updates.description !== undefined) supabaseUpdates.description = updates.description
      if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority
      if (updates.status !== undefined) supabaseUpdates.status = updates.status
      if (updates.startDate !== undefined) supabaseUpdates.start_date = updates.startDate
      if (updates.dueDate !== undefined) supabaseUpdates.due_date = updates.dueDate
      if (updates.department !== undefined) supabaseUpdates.department = updates.department

      // Handle assignee updates separately using the new assignment system
      let assigneeUpdates: { assignee_ids: string[] } | null = null
      if (updates.assignees !== undefined) {
        assigneeUpdates = { assignee_ids: updates.assignees }
      }

      const { data, error: updateError } = await supabase
        .from('tasks')
        .update({ ...supabaseUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating task:', updateError)
        setError(updateError.message)
        return null
      }

      // Handle assignee updates if needed
      if (assigneeUpdates && user) {
        try {
          // Get current assignments
          const { data: currentAssignments, error: fetchError } = await supabase
            .from('task_assignments')
            .select('team_member_id') // Changed from user_id to team_member_id
            .eq('task_id', id)

          if (fetchError) {
            console.warn('Failed to fetch current assignments:', fetchError)
          } else {
            const currentAssigneeIds = currentAssignments?.map(a => a.team_member_id) || [] // Changed from user_id
            const newAssigneeIds = assigneeUpdates.assignee_ids

            // Find assignees to add
            const assigneesToAdd = newAssigneeIds.filter(id => !currentAssigneeIds.includes(id))
            
            // Find assignees to remove
            const assigneesToRemove = currentAssigneeIds.filter(id => !newAssigneeIds.includes(id))

            // Remove old assignments
            if (assigneesToRemove.length > 0) {
              const { error: deleteError } = await supabase
                .from('task_assignments')
                .delete()
                .eq('task_id', id)
                .in('team_member_id', assigneesToRemove) // Changed from user_id

              if (deleteError) {
                console.warn('Failed to remove old assignments:', deleteError)
              }
            }

            // Add new assignments
            if (assigneesToAdd.length > 0) {
              const newAssignments = assigneesToAdd.map(userId => ({
                task_id: id,
                team_member_id: userId, // Changed from user_id to team_member_id
                assigned_at: new Date().toISOString(),
                assigned_by: user.id,
                role: 'assignee'
              }))

              const { error: insertError } = await supabase
                .from('task_assignments')
                .insert(newAssignments)

              if (insertError) {
                console.warn('Failed to add new assignments:', insertError)
              }
            }
          }
        } catch (error) {
          console.warn('Error updating assignments:', error)
        }
      }

      // Convert back to UI format and update state
      const updatedUITask = convertSupabaseToUITask(data)
      setTasks(prev => prev.map(task => task.id === id ? updatedUITask : task))
      return updatedUITask
    } catch (err) {
      console.error('Error in updateTask:', err)
      setError('Failed to update task')
      return null
    }
  }

  // Delete a task
  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting task:', deleteError)
        setError(deleteError.message)
        return false
      }

      setTasks(prev => prev.filter(task => task.id !== id))
      return true
    } catch (err) {
      console.error('Error in deleteTask:', err)
      setError('Failed to delete task')
      return false
    }
  }

  // Add a subtask
  const addSubtask = async (subtaskData: CreateSubtaskData): Promise<Subtask | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('subtasks')
        .insert([subtaskData])
        .select()
        .single()

      if (insertError) {
        console.error('Error adding subtask:', insertError)
        return null
      }

      setSubtasks(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error in addSubtask:', err)
      return null
    }
  }

  // Update a subtask
  const updateSubtask = async (id: string, updates: Partial<Subtask>): Promise<Subtask | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('subtasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating subtask:', updateError)
        return null
      }

      setSubtasks(prev => prev.map(subtask => subtask.id === id ? data : subtask))
      return data
    } catch (err) {
      console.error('Error in updateSubtask:', err)
      return null
    }
  }

  // Delete a subtask
  const deleteSubtask = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting subtask:', deleteError)
        return false
      }

      setSubtasks(prev => prev.filter(subtask => subtask.id !== id))
      return true
    } catch (err) {
      console.error('Error in deleteSubtask:', err)
      return false
    }
  }

  // Add a comment
  const addComment = async (commentData: CreateCommentData): Promise<Comment | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single()

      if (insertError) {
        console.error('Error adding comment:', insertError)
        return null
      }

      setComments(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error in addComment:', err)
      return null
    }
  }

  // Update a comment
  const updateComment = async (id: string, updates: Partial<Comment>): Promise<Comment | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('comments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating comment:', updateError)
        return null
      }

      setComments(prev => prev.map(comment => comment.id === id ? data : comment))
      return data
    } catch (err) {
      console.error('Error in updateComment:', err)
      return null
    }
  }

  // Delete a comment
  const deleteComment = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting comment:', deleteError)
        return false
      }

      setComments(prev => prev.filter(comment => comment.id !== id))
      return true
    } catch (err) {
      console.error('Error in deleteComment:', err)
      return false
    }
  }

  // Get tasks by status
  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status)
  }

  // Get tasks by priority
  const getTasksByPriority = (priority: string) => {
    return tasks.filter(task => task.priority === priority)
  }

  // Get tasks by department
  const getTasksByDepartment = (department: string) => {
    return tasks.filter(task => task.department === department)
  }

  // Get subtasks for a specific task
  const getSubtasksForTask = (taskId: string) => {
    return subtasks.filter(subtask => subtask.task_id === taskId)
  }

  // Get comments for a specific task or subtask
  const getCommentsForTask = (taskId: string) => {
    return comments.filter(comment => comment.task_id === taskId)
  }

  const getCommentsForSubtask = (subtaskId: string) => {
    return comments.filter(comment => comment.subtask_id === subtaskId)
  }

  // Search tasks
  const searchTasks = (query: string) => {
    if (!query.trim()) return tasks
    
    const searchTerm = query.toLowerCase()
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm) ||
      (task.description && task.description.toLowerCase().includes(searchTerm))
    )
  }

  // Clear error
  const clearError = () => {
    setError(null)
  }

  // Initialize data and set up real-time subscriptions
  useEffect(() => {
    // Only fetch tasks if user is authenticated
    if (user) {
      console.log('🔄 User authenticated, fetching tasks...')
      fetchTasks()
    } else {
      console.log('⚠️ User not authenticated, clearing tasks')
      setTasks([])
      setSubtasks([])
      setComments([])
    }

    // Set up real-time subscription for tasks
    const tasksChannel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Check if task already exists to prevent duplicates
            const existingTask = tasks.find(task => task.id === payload.new.id)
            if (!existingTask) {
              const newUITask = convertSupabaseToUITask(payload.new as SupabaseTask)
              console.log('🔄 Adding new task via real-time:', newUITask.id, newUITask.title)
              setTasks(prev => [newUITask, ...prev])
            } else {
              console.log('⚠️ Duplicate task detected, skipping:', payload.new.id, payload.new.title)
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedUITask = convertSupabaseToUITask(payload.new as SupabaseTask)
            setTasks(prev => prev.map(task => task.id === payload.new.id ? updatedUITask : task))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Set up real-time subscription for subtasks
    const subtasksChannel = supabase
      .channel('subtasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subtasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Check if subtask already exists to prevent duplicates
            const existingSubtask = subtasks.find(subtask => subtask.id === payload.new.id)
            if (!existingSubtask) {
              const newSubtask = {
                ...payload.new,
                startDate: payload.new.start_date ? new Date(payload.new.start_date) : undefined,
                endDate: payload.new.end_date ? new Date(payload.new.end_date) : undefined,
                assignees: [] // Will be populated separately
              } as Subtask
              setSubtasks(prev => [...prev, newSubtask])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedSubtask = {
              ...payload.new,
              startDate: payload.new.start_date ? new Date(payload.new.start_date) : undefined,
              endDate: payload.new.end_date ? new Date(payload.new.end_date) : undefined,
              assignees: [] // Will be populated separately
            } as Subtask
            setSubtasks(prev => prev.map(subtask => subtask.id === payload.new.id ? updatedSubtask : subtask))
          } else if (payload.eventType === 'DELETE') {
            setSubtasks(prev => prev.filter(subtask => subtask.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Set up real-time subscription for comments
    const commentsChannel = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Check if comment already exists to prevent duplicates
            const existingComment = comments.find(comment => comment.id === payload.new.id)
            if (!existingComment) {
              setComments(prev => [...prev, payload.new as Comment])
            }
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => prev.map(comment => comment.id === payload.new.id ? payload.new as Comment : comment))
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(comment => comment.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(subtasksChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [user]) // Add user as dependency

  return {
    // State
    tasks,
    subtasks,
    comments,
    loading,
    error,
    
    // Actions
    fetchTasks,
    fetchSubtasks,
    fetchComments,
    fetchTaskAssignments,
    addTask,
    createTaskWithAssignees, // Add the new function
    updateTask,
    deleteTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    addComment,
    updateComment,
    deleteComment,
    
    // Queries
    getTasksByStatus,
    getTasksByPriority,
    getTasksByDepartment,
    getSubtasksForTask,
    getCommentsForTask,
    getCommentsForSubtask,
    searchTasks,
    
    // Computed values
    tasksCount: tasks.length,
    hasAddTask: !!user,
    hasUpdateTask: !!user,
    hasDeleteTask: !!user,
    
    // Utilities
    clearError,
  }
}
