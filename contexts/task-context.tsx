"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import { useTasks, type Task, type Subtask, type Comment } from "@/hooks/use-tasks"
import { useAuth } from "@/contexts/auth-context"

interface FilterType {
  type: "all" | "completed" | "attention"
}

interface TaskContextType {
  tasks: Task[]
  filter: FilterType
  searchQuery: string
  addTask: (task: Omit<Task, "id">) => Promise<Task | null>
  createTaskWithAssignees: (task: Omit<Task, "id">) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>
  deleteTask: (id: string) => void
  getTasksByStatus: (status: string) => Task[]
  fetchTasks: () => Promise<void>
  fetchSubtasks: (taskId: string) => Promise<void>
  fetchTaskDetails: (taskId: string) => Promise<any>
  addSubtask: (subtaskData: any) => Promise<any>
  updateSubtask: (id: string, updates: any) => Promise<any>
  deleteSubtask: (id: string) => Promise<boolean>
  getTempSubtasks: () => any[]
  clearTempSubtasks: () => void
  addComment: (commentData: any) => Promise<Comment | null>
  updateComment: (id: string, updates: any) => Promise<any>
  deleteComment: (id: string) => Promise<boolean>
  setFilter: (filter: FilterType) => void
  setSearchQuery: (query: string) => void
  getFilteredTasks: () => Task[]
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: ReactNode }) {
  // Wait for user authentication before initializing useTasks
  const { user, loading: authLoading } = useAuth()
  
  // Always call useTasks to maintain hook order consistency
  const {
    tasks,
    addTask: supabaseAddTask,
    createTaskWithAssignees: supabaseCreateTaskWithAssignees,
    updateTask: supabaseUpdateTask,
    deleteTask: supabaseDeleteTask,
    getTasksByStatus,
    fetchTasks: supabaseFetchTasks,
    fetchSubtasks: supabaseFetchSubtasks,
    fetchTaskDetails: supabaseFetchTaskDetails,
    addSubtask: supabaseAddSubtaskOriginal,
    updateSubtask: supabaseUpdateSubtask,
    deleteSubtask: supabaseDeleteSubtask,
    addComment: supabaseAddComment,
    updateComment: supabaseUpdateComment,
    deleteComment: supabaseDeleteComment,
  } = useTasks()

  const [filter, setFilter] = useState<FilterType>({ type: "all" })
  const [searchQuery, setSearchQuery] = useState<string>("")
  
  // State to track temporary subtasks during task creation
  const [tempSubtasks, setTempSubtasks] = useState<any[]>([])

  // Wrapper functions to maintain the same interface
  const addTask = async (taskData: Omit<Task, "id">) => {
    // Check if user is authenticated
    if (!user || authLoading) {
      console.error('❌ TaskContext: User not authenticated, cannot add task')
      throw new Error('User not authenticated')
    }

    try {
      const result = await supabaseAddTask(taskData)
      return result
    } catch (error) {
      console.error('❌ TaskContext addTask ERROR:', error)
      throw error
    }
  }

  // Wrapper function for createTaskWithAssignees
  const createTaskWithAssignees = async (taskData: Omit<Task, "id">) => {
    // Check if user is authenticated
    if (!user || authLoading) {
      console.error('❌ TaskContext: User not authenticated, cannot create task')
      throw new Error('User not authenticated')
    }

    try {
      const result = await supabaseCreateTaskWithAssignees(taskData)
      return result
    } catch (error) {
      console.error('❌ TaskContext createTaskWithAssignees ERROR:', error)
      throw error
    }
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user || authLoading) {
      console.error('❌ TaskContext: User not authenticated, cannot update task')
      throw new Error('User not authenticated')
    }

    try {
      const result = await supabaseUpdateTask(id, updates)
      return result
    } catch (error) {
      console.error('❌ TaskContext updateTask ERROR:', error)
      throw error
    }
  }

  const deleteTask = async (id: string) => {
    if (!user || authLoading) {
      console.error('❌ TaskContext: User not authenticated, cannot delete task')
      throw new Error('User not authenticated')
    }

    try {
      await supabaseDeleteTask(id)
    } catch (error) {
      console.error('❌ TaskContext deleteTask ERROR:', error)
      throw error
    }
  }

  const updateSubtask = async (id: string, updates: any) => {
    if (!user || authLoading) {
      console.error('❌ TaskContext: User not authenticated, cannot update subtask')
      return null
    }
    try {
      const result = await supabaseUpdateSubtask(id, updates)
      return result
    } catch (error) {
      console.error('❌ TaskContext: updateSubtask error:', error)
      throw error
    }
  }

  // Smart addSubtask wrapper that handles creation mode
  const addSubtask = async (subtaskData: any) => {
    console.log('🔄 TASK CONTEXT - addSubtask called with:', subtaskData)
    
    // Check if we're in task creation mode (temp-task-id)
    if (subtaskData.task_id === 'temp-task-id' || subtaskData.task_id?.startsWith('temp-')) {
      console.log('🏗️ TASK CONTEXT - Using temporary subtask mode')
      
      // Generate temporary ID for UI
      const tempSubtask = {
        ...subtaskData,
        id: `temp-subtask-${Date.now()}-${Math.random()}`,
        completed: false
      }
      
      // Store in temporary state
      setTempSubtasks(prev => [...prev, tempSubtask])
      
      console.log('✅ TASK CONTEXT - Created temp subtask:', tempSubtask)
      return tempSubtask
    } else {
      console.log('💾 TASK CONTEXT - Using database mode, calling supabaseAddSubtaskOriginal')
      const result = await supabaseAddSubtaskOriginal(subtaskData)
      console.log('📥 TASK CONTEXT - supabaseAddSubtaskOriginal result:', result)
      return result
    }
  }

  // Function to get and clear temp subtasks (for task creation)
  const getTempSubtasks = () => tempSubtasks
  const clearTempSubtasks = () => setTempSubtasks([])

  const getFilteredTasks = () => {
    // Ensure tasks is always an array
    const safeTasks = tasks || []
    
    let filteredTasks = safeTasks

    if (searchQuery.trim()) {
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          task.assignees.some((assigneeId) => {
            return false
          }),
      )
    }

    switch (filter.type) {
      case "completed":
        return filteredTasks.filter((task) => task.status === "Completed")
      case "attention":
        return filteredTasks.filter((task) => task.priority === "Critical")
      case "all":
      default:
        return filteredTasks
    }
  }

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    tasks,
    filter,
    searchQuery,
    addTask,
    createTaskWithAssignees,
    updateTask,
    deleteTask,
    getTasksByStatus,
    fetchTasks: supabaseFetchTasks,
    fetchSubtasks: supabaseFetchSubtasks,
    fetchTaskDetails: supabaseFetchTaskDetails,
    addSubtask,
    updateSubtask,
    deleteSubtask: supabaseDeleteSubtask,
    getTempSubtasks,
    clearTempSubtasks,
    addComment: supabaseAddComment,
    updateComment: supabaseUpdateComment,
    deleteComment: supabaseDeleteComment,
    setFilter,
    setSearchQuery,
    getFilteredTasks,
  }), [
    tasks,
    filter,
    searchQuery,
    addTask,
    createTaskWithAssignees,
    updateTask,
    deleteTask,
    getTasksByStatus,
    supabaseFetchTasks,
    supabaseFetchSubtasks,
    supabaseFetchTaskDetails,
    addSubtask,
    updateSubtask,
    supabaseDeleteSubtask,
    getTempSubtasks,
    clearTempSubtasks,
    supabaseAddComment,
    supabaseUpdateComment,
    supabaseDeleteComment,
    setFilter,
    setSearchQuery,
    getFilteredTasks,
  ])

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTaskContext() {
  const context = useContext(TaskContext)
  if (context === undefined) {
    throw new Error("useTaskContext must be used within a TaskProvider")
  }
  return context
}
