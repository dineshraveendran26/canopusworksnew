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
  const { user } = useAuth()
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Convert Supabase task to UI task format
  const convertSupabaseToUITask = useCallback((supabaseTask: any): Task => {
    // Use subtasks from the passed parameter if available, otherwise fallback to state
    const passedSubtasks = supabaseTask.subtasks || []
    const taskSubtasks = passedSubtasks.length > 0 
      ? passedSubtasks 
      : subtasks.filter((st: Subtask) => st.task_id === supabaseTask.id)
    
    console.log('🔍 convertSupabaseToUITask called for task:', supabaseTask.id, 'with subtasks:', taskSubtasks.length)
    console.log('🔍 Using subtasks from:', passedSubtasks.length > 0 ? 'parameter' : 'state')
    
    // Use comments from the passed parameter if available
    const taskComments = supabaseTask.comments || []
    
    // Use assignees from the passed parameter if available
    const taskAssignees = supabaseTask.assignees || []
    
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
      assignees: taskAssignees,
      subtasks: taskSubtasks.map((subtask: any) => ({
        ...subtask,
        startDate: subtask.startDate || undefined,
        endDate: subtask.endDate || undefined,
        assignees: subtask.assignees || [], // Ensure assignees array exists
        comments: subtask.comments || [] // Ensure comments array exists
      })),
      comments: taskComments,
      department: supabaseTask.department,
      attachments: attachments,
      documentLinks: supabaseTask.document_links || []
    }
  }, [subtasks]) // Add dependency array for useCallback

  // Check database schema to see what columns exist
  const checkDatabaseSchema = async () => {
    try {
      // Try to get the table info
      const { data: tableInfo, error: tableError } = await supabase
        .from('tasks')
        .select('*')
        .limit(0)
      
      if (tableError) {
        console.error('❌ Error checking table schema:', tableError)
        return
      }
      
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
    
    if (!user) {
      console.error('❌ No user in convertUIToSupabaseTask')
      throw new Error('User must be authenticated to create tasks')
    }
    
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
    
    return supabaseTaskData;
  }

  // New function to create task with proper multiple assignee support
  const createTaskWithAssignees = async (uiTask: Omit<Task, "id">): Promise<Task | null> => {
    
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
        
        console.log('🔍 CREATETASK DEBUG - Processing assignees:', uiTask.assignees)
        console.log('🔍 CREATETASK DEBUG - User ID:', user.id)
        console.log('🔍 CREATETASK DEBUG - Task ID:', newTask.id)
        
        // Check if team members exist first
        const { data: validTeamMembers, error: validationError } = await supabase
          .from('team_members')
          .select('id')
          .in('id', uiTask.assignees)
          .eq('is_active', true)
        
        if (validationError) {
          console.error('❌ Error validating team members:', validationError)
          console.warn('⚠️ Continuing without validation check')
        } else {
          const validIds = validTeamMembers?.map(tm => tm.id) || []
          const invalidIds = uiTask.assignees.filter(id => !validIds.includes(id))
          if (invalidIds.length > 0) {
            console.warn('⚠️ Invalid team member IDs found:', invalidIds)
            console.log('✅ Valid team member IDs:', validIds)
          }
        }
        
        // Create assignments in the task_assignments table
        const assignments = uiTask.assignees.map(userId => ({
          task_id: newTask.id,
          team_member_id: userId, // Changed from user_id to team_member_id
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
          role: 'assignee'
        }))
        
        console.log('🔍 CREATETASK DEBUG - Assignment data:', assignments)
        
        const { error: assignmentError } = await supabase
          .from('task_assignments')
          .insert(assignments)
        
        if (assignmentError) {
          console.error('❌ Error assigning users to task:', assignmentError)
          console.error('❌ Assignment details:', {
            taskId: newTask.id,
            assignees: uiTask.assignees,
            assignments: assignments
          })
          // Don't fail the entire operation, just log the error
          console.warn('⚠️ Task created but user assignment failed')
        } else {
          console.log('✅ Successfully assigned users to task')
        }
      } else {
        console.log('🔍 CREATETASK DEBUG - No assignees to process:', uiTask.assignees)
      }
      
      // REMOVED: Subtask creation logic (now handled in TaskModal)
      // The subtasks will be created separately after task creation
      
      // Convert back to UI format and add to state
      const uiTaskData = convertSupabaseToUITask(newTask)
      // Note: Task will be added to state via real-time subscription to prevent duplicates
      // setTasks(prev => [uiTaskData, ...prev]) // Removed to prevent duplicates
      
      return uiTaskData
      
    } catch (error) {
      console.error('❌ Unexpected error in createTaskWithAssignees:', error)
      setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Fetch all tasks (optimized for performance)
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      if (!user) {
        setTasks([])
        setLoading(false)
        return
      }

      console.log('🚀 PERFORMANCE: Starting fast task fetch...')
      const startTime = Date.now()

      // Emergency timeout - only clear if still loading after 15 seconds
      const emergencyTimeout = setTimeout(() => {
        console.warn('🚨 EMERGENCY: Forcing loading to false after 15 seconds')
        setLoading(false)
        // Don't clear tasks if they were already loaded - check current state
        setTasks(currentTasks => {
          if (currentTasks.length === 0) {
            console.warn('🚨 EMERGENCY: No tasks loaded, setting empty array')
            return []
          } else {
            console.warn('🚨 EMERGENCY: Tasks already loaded, keeping them')
            return currentTasks
          }
        })
      }, 15000)

      // STAGE 1: Fetch basic task data with essential joins only
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignments!left(
            team_member_id,
            team_members!task_assignments_team_member_id_fkey(
              id,
              full_name,
              email,
              role,
              department
            )
          ),
          subtasks!left(id, title, completed, order_index, start_date, end_date)
        `)
        .order('updated_at', { ascending: false })

      if (fetchError) {
        console.error('❌ Error fetching tasks:', fetchError)
        setError(fetchError.message)
        return
      }

      const basicLoadTime = Date.now() - startTime
      console.log(`🚀 PERFORMANCE: Basic task data loaded in ${basicLoadTime}ms`)

      if (data && data.length > 0) {
        // Convert to UI format with lightweight data
        const uiTasks = data.map((task: any) => {
          // Extract full team member data from assignments
          const taskAssignees = (task.task_assignments || [])
            .map((ta: any) => ta.team_members)
            .filter(Boolean)
            .map((tm: any) => ({
              id: tm.id,
              name: tm.full_name,
              email: tm.email,
              role: tm.role,
              department: tm.department
            }))

          // Simple subtasks extraction (basic info only)
          const taskSubtasks = (task.subtasks || []).map((subtask: any) => ({
            id: subtask.id,
            title: subtask.title,
            status: subtask.completed ? 'Completed' : 'Todo', // Map completed boolean to status string
            order_index: subtask.order_index,
            task_id: task.id,
            description: '', // Load on-demand
            assignees: [], // Load on-demand
            comments: [], // Load on-demand
            priority: 'Medium',
            startDate: subtask.start_date, // Add missing start_date
            endDate: subtask.end_date, // Add missing end_date
            due_date: null,
            created_at: task.created_at,
            updated_at: task.updated_at
          })).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) // Sort by order_index

          return {
            id: task.id,
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            startDate: task.start_date, // Add missing start_date
            dueDate: task.due_date, // Fix: use dueDate instead of due_date to match Task interface
            department: task.department,
            assignees: taskAssignees,
            subtasks: taskSubtasks,
            comments: [], // Load on-demand when task is opened
            attachments: (task.document_links || []).map((link: string, index: number) => {
              // Ensure the link has a proper protocol
              let processedLink = link.trim()
              if (!processedLink.startsWith('http://') && !processedLink.startsWith('https://')) {
                processedLink = 'https://' + processedLink
              }
              
              return {
                id: `attachment-${index}`,
                description: `Document ${index + 1}`,
                link: processedLink,
                createdAt: task.created_at || new Date().toISOString()
              }
            }),
            documentLinks: task.document_links || [], // Add documentLinks field for editing
            created_by: task.created_by,
            created_at: task.created_at,
            updated_at: task.updated_at
          }
        })
        
        const totalTime = Date.now() - startTime
        console.log(`🚀 PERFORMANCE: Total task conversion completed in ${totalTime}ms for ${uiTasks.length} tasks`)
        
        // Set tasks with basic data for immediate UI display
        setTasks(uiTasks)
      } else {
        setTasks([])
      }
    } catch (err) {
      console.error('❌ Error in fetchTasks:', err)
      setError('Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [user])

  // NEW: Fetch detailed data for a specific task (on-demand)
  const fetchTaskDetails = useCallback(async (taskId: string) => {
    try {
      console.log('🔍 PERFORMANCE: Loading detailed data for task:', taskId)
      
      // Fetch detailed subtasks, comments, and assignments for this specific task
      const [subtasksResult, commentsResult, taskAssignmentsResult] = await Promise.all([
        // Detailed subtasks with assignments
        supabase
          .from('subtasks')
          .select(`
            *,
            subtask_assignments(
              team_member_id,
              team_members!subtask_assignments_team_member_id_fkey(
                id,
                full_name,
                email,
                role,
                department
              )
            )
          `)
          .eq('task_id', taskId)
          .order('order_index', { ascending: true }),
        
        // Comments for task and its subtasks - simplified approach
        supabase
          .from('comments')
          .select(`
            *,
            users!comments_author_id_fkey(id, email, full_name)
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: true }),

        // Task assignments with full team member data
        supabase
          .from('task_assignments')
          .select(`
            team_member_id,
            team_members!task_assignments_team_member_id_fkey(
              id,
              full_name,
              email,
              role,
              department
            )
          `)
          .eq('task_id', taskId)
      ])

      // Now fetch subtask comments separately to avoid complex OR queries
      let subtaskComments: any[] = []
      if (subtasksResult.data && subtasksResult.data.length > 0) {
        const subtaskIds = subtasksResult.data.map((subtask: any) => subtask.id)
        console.log('🔍 DEBUG: Fetching comments for subtask IDs:', subtaskIds)
        const { data: subtaskCommentsData, error: subtaskCommentsError } = await supabase
          .from('comments')
          .select(`
            *,
            users!comments_author_id_fkey(id, email, full_name)
          `)
          .in('subtask_id', subtaskIds)
          .order('created_at', { ascending: true })
        
        console.log('🔍 DEBUG: Subtask comments query result:', {
          data: subtaskCommentsData,
          error: subtaskCommentsError,
          count: subtaskCommentsData?.length || 0
        })
        
        if (!subtaskCommentsError && subtaskCommentsData) {
          // Transform Supabase comment data to UI format
          subtaskComments = subtaskCommentsData.map((comment: any) => ({
            ...comment,
            author: {
              id: comment.users?.id || comment.author_id,
              name: comment.users?.full_name || 'Unknown User',
              initials: comment.users?.full_name ? 
                comment.users.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 
                'UN',
              email: comment.users?.email
            },
            timestamp: new Date(comment.created_at),
            editedAt: comment.updated_at ? new Date(comment.updated_at) : undefined
          }))
        }
      }

      // Transform task comments to UI format as well
      const transformedTaskComments = (commentsResult.data || []).map((comment: any) => ({
        ...comment,
        author: {
          id: comment.users?.id || comment.author_id,
          name: comment.users?.full_name || 'Unknown User',
          initials: comment.users?.full_name ? 
            comment.users.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 
            'UN',
          email: comment.users?.email
        },
        timestamp: new Date(comment.created_at),
        editedAt: comment.updated_at ? new Date(comment.updated_at) : undefined
      }))

      // Transform subtasks with full assignee data
      const transformedSubtasks = (subtasksResult.data || []).map((subtask: any) => ({
        ...subtask,
        startDate: subtask.start_date ? new Date(subtask.start_date) : undefined,
        endDate: subtask.end_date ? new Date(subtask.end_date) : undefined,
        assignees: (subtask.subtask_assignments || [])
          .map((sa: any) => sa.team_member_id)
          .filter(Boolean)
      }))

      // Transform task assignments to full team member objects
      const transformedTaskAssignments = (taskAssignmentsResult.data || [])
        .map((ta: any) => ta.team_members)
        .filter(Boolean)
        .map((tm: any) => ({
          id: tm.id,
          name: tm.full_name,
          email: tm.email,
          role: tm.role,
          department: tm.department
        }))

      // Combine task comments and subtask comments
      const allComments = [...transformedTaskComments, ...subtaskComments]

      return {
        subtasks: transformedSubtasks,
        comments: allComments,
        taskAssignments: transformedTaskAssignments,
        subtasksError: subtasksResult.error,
        commentsError: commentsResult.error,
        taskAssignmentsError: taskAssignmentsResult.error
      }
    } catch (error) {
      console.error('❌ Error fetching task details:', error)
      return { subtasks: [], comments: [], taskAssignments: [], subtasksError: error, commentsError: null, taskAssignmentsError: null }
    }
  }, [])

  // Fetch subtasks for a specific task with assignees
  const fetchSubtasks = useCallback(async (taskId: string) => {
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
        (subtasksData || []).map(async (subtask: any) => {
          const { data: assigneesData, error: assigneesError } = await supabase
            .from('subtask_assignments')
            .select(`
              team_member_id,
              team_members!subtask_assignments_team_member_id_fkey(
                id,
                full_name,
                email,
                role,
                department
              )
            `)
            .eq('subtask_id', subtask.id) // Fix: Add this filter to get only assignees for this specific subtask

          if (assigneesError) {
            console.warn('Error fetching subtask assignees:', assigneesError)
            return { ...subtask, assignees: [] }
          }

          const assignees = (assigneesData || [])
            .map((a: any) => a.team_members)
            .filter(Boolean)
            .map((tm: any) => ({
              id: tm.id,
              name: tm.full_name,
              email: tm.email,
              role: tm.role,
              department: tm.department
            }))

          return {
            ...subtask,
            startDate: subtask.start_date ? new Date(subtask.start_date) : undefined,
            endDate: subtask.end_date ? new Date(subtask.end_date) : undefined,
            assignees: assignees
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
  }, [])

  // Fetch task assignments for a specific task
  const fetchTaskAssignments = useCallback(async (taskId: string): Promise<any[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('task_assignments')
        .select(`
          team_member_id,
          team_members!task_assignments_team_member_id_fkey(
            id,
            full_name,
            email,
            role,
            department
          )
        `)
        .eq('task_id', taskId)

      if (fetchError) {
        console.error('Error fetching task assignments:', fetchError)
        return []
      }

      return (data || [])
        .map((assignment: any) => assignment.team_members)
        .filter(Boolean)
        .map((tm: any) => ({
          id: tm.id,
          name: tm.full_name,
          email: tm.email,
          role: tm.role,
          department: tm.department
        }))
    } catch (err) {
      console.error('Error in fetchTaskAssignments:', err)
      return []
    }
  }, [])

  // Fetch comments for a specific task or subtask
  const fetchComments = useCallback(async (taskId?: string, subtaskId?: string) => {
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
  }, [])

  // Add a new task
  const addTask = async (taskData: Omit<Task, "id">): Promise<Task | null> => {
    try {
      // Check authentication status
      if (!user) {
        console.error('❌ No authenticated user found')
        setError('You must be logged in to create tasks')
        return null
      }
      
      // Check Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
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
      const supabaseTaskData = convertUIToSupabaseTask(taskData)
      
      // Validate converted data
      if (!supabaseTaskData.title || supabaseTaskData.title.trim() === '') {
        console.error('❌ Converted task data is invalid:', supabaseTaskData)
        setError('Invalid task data')
        return null
      }

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

      // Convert back to UI format and add to state
      const newUITask = convertSupabaseToUITask(data)
      
      setTasks(prev => [newUITask, ...prev])
      
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
      if (updates.startDate !== undefined) supabaseUpdates.start_date = updates.startDate || undefined
      if (updates.dueDate !== undefined) supabaseUpdates.due_date = updates.dueDate || undefined
      if (updates.department !== undefined) supabaseUpdates.department = updates.department
      if (updates.documentLinks !== undefined) supabaseUpdates.document_links = updates.documentLinks

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
      console.log('💾 USE-TASKS - addSubtask called with data:', subtaskData)
      
      const { data, error: insertError } = await supabase
        .from('subtasks')
        .insert([subtaskData])
        .select()
        .single()

      console.log('📡 USE-TASKS - Supabase response:', { data, error: insertError })

      if (insertError) {
        console.error('❌ USE-TASKS - Error adding subtask:', insertError)
        return null
      }

      console.log('✅ USE-TASKS - Subtask added successfully:', data)
      setSubtasks(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('❌ USE-TASKS - Error in addSubtask:', err)
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
    console.log('🔄 addComment called with data:', commentData)
    console.log('📊 Data validation:', {
      hasContent: !!commentData.content,
      contentLength: commentData.content?.length,
      hasAuthorId: !!commentData.author_id,
      authorId: commentData.author_id,
      hasTaskId: !!commentData.task_id,
      taskId: commentData.task_id,
      hasSubtaskId: !!commentData.subtask_id,
      subtaskId: commentData.subtask_id,
      isInternal: commentData.is_internal
    })
    
    try {
      console.log('💾 Inserting comment into database...')
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error adding comment:', insertError)
        console.error('❌ Error code:', insertError.code)
        console.error('❌ Error message:', insertError.message)
        console.error('❌ Error details:', insertError.details)
        console.error('❌ Error hint:', insertError.hint)
        return null
      }

      console.log('✅ Comment inserted successfully:', data)
      setComments(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('❌ Error in addComment:', err)
      console.error('❌ Error type:', typeof err)
      console.error('❌ Error toString:', err?.toString())
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
      fetchTasks()
    } else {
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
            setTasks(prev => {
              const existingTask = prev.find(task => task.id === payload.new.id)
              if (!existingTask) {
                const newUITask = convertSupabaseToUITask(payload.new as SupabaseTask)
                return [newUITask, ...prev]
              } else {
                return prev
              }
            })
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
            setSubtasks(prev => {
              // Check if subtask already exists to prevent duplicates
              const existingSubtask = prev.find(subtask => subtask.id === payload.new.id)
              if (!existingSubtask) {
                const newSubtask = {
                  ...payload.new,
                  startDate: payload.new.start_date ? new Date(payload.new.start_date) : undefined,
                  endDate: payload.new.end_date ? new Date(payload.new.end_date) : undefined,
                  assignees: [] // Will be populated separately
                } as Subtask
                return [...prev, newSubtask]
              }
              return prev
            })
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
            setComments(prev => {
              // Check if comment already exists to prevent duplicates
              const existingComment = prev.find(comment => comment.id === payload.new.id)
              if (!existingComment) {
                return [...prev, payload.new as Comment]
              }
              return prev
            })
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
  }, [user?.id, fetchTasks]) // Add fetchTasks to dependencies

  return {
    // State
    tasks,
    subtasks,
    comments,
    loading,
    error,
    
    // Actions
    fetchTasks,
    fetchTaskDetails, // NEW: On-demand detailed data loading
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
