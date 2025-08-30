"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useTaskContext } from "@/contexts/task-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarIcon, Users, Trash2, Paperclip, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { SubtaskList } from "@/components/subtask-list"
import { CommentsSection } from "@/components/comments-section"
import { useTeamMembers } from "@/hooks/use-team-members"
import { useTaskAssignments } from "@/hooks/use-task-assignments"
import type { Task } from "@/hooks/use-tasks"
import { supabase } from "@/lib/supabase"

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task // Use proper Task type instead of any
  mode?: "create" | "edit"
}

// Define the form data type
interface TaskFormData {
  title: string
  description: string
  status: "Todo" | "In Progress" | "Completed"
  priority: "Low" | "Medium" | "High" | "Critical"
  startDate?: Date
  dueDate?: Date
  department: string
}

export function TaskModal({ open, onOpenChange, task, mode = "create" }: TaskModalProps) {
  const { addTask, createTaskWithAssignees, updateTask, deleteTask, fetchTasks, fetchSubtasks, addSubtask, addComment } = useTaskContext()
  const { teamMembers, loading: teamMembersLoading } = useTeamMembers()
  const { updateTaskAssignments, loading: assignmentLoading } = useTaskAssignments()

  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "Todo",
    priority: task?.priority || "Medium",
    startDate: task?.startDate ? new Date(task?.startDate) : undefined,
    dueDate: task?.dueDate ? new Date(task?.dueDate) : undefined,
    department: task?.department || "",
  })

  const [subtasks, setSubtasks] = useState(task?.subtasks || [])
  
  // Debug wrapper for setSubtasks
  const debugSetSubtasks = (newSubtasks: any) => {
    console.log('📝 TASK MODAL - setSubtasks called with:', newSubtasks.length, 'subtasks')
    console.log('📋 TASK MODAL - Subtasks:', newSubtasks.map((st: any) => ({ id: st.id, title: st.title })))
    setSubtasks(newSubtasks)
  }
  const [comments, setCommentsState] = useState(task?.comments || [])
  
  // Safe comments setter that prevents overriding temporary comments
  const setComments = useCallback((newComments: any[]) => {
    setCommentsState(currentComments => {
      // Allow updates if:
      // 1. No temporary comments exist, OR
      // 2. The update is converting temporary comments to permanent ones (same or more comments with real IDs)
      const currentTempComments = currentComments.filter((c: any) => 
        c.uploadStatus === 'uploading' || c.id?.startsWith('temp-comment-')
      )
      
      // If no temporary comments, always allow update
      if (currentTempComments.length === 0) {
        console.log('✅ Safe comment update (no temp comments):', newComments.length, 'comments')
        return newComments
      }
      
      // If we have temporary comments, check if this update is resolving them
      const newCommentCount = newComments.length
      const currentCommentCount = currentComments.length
      const newHasRealIds = newComments.every((c: any) => !c.id?.startsWith('temp-comment-'))
      
      // Allow update if we're converting temp comments to real ones
      if (newCommentCount >= currentCommentCount && newHasRealIds) {
        console.log('✅ Safe comment update (temp->real conversion):', newComments.length, 'comments')
        return newComments
      }
      
      // Block updates that would remove temporary comments inappropriately
      console.log('⚠️ Skipping comment update - would remove temporary comments inappropriately')
      console.log('Current comments:', currentComments.map((c: any) => ({ id: c.id, status: c.uploadStatus })))
      console.log('New comments:', newComments.map((c: any) => ({ id: c.id, status: c.uploadStatus })))
      return currentComments // Keep current comments
    })
  }, [])
  const [attachments, setAttachments] = useState(task?.attachments || [])
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false)
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [commentsLoaded, setCommentsLoaded] = useState(false)

  const [attachmentForm, setAttachmentForm] = useState({
    description: "",
    link: "",
  })

  // Function to load comments for a specific task
  const loadTaskComments = useCallback(async (taskId: string) => {
    try {
      console.log('🔄 Loading comments for task:', taskId)
      console.log('🔄 STACK TRACE:', new Error().stack)
      
      // Fetch comments for this specific task
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          users!comments_author_id_fkey(id, email, full_name)
        `)
        .eq('task_id', taskId)
        .is('subtask_id', null)
        .order('created_at', { ascending: true })

      if (commentsError) {
        console.error('❌ Error loading task comments:', commentsError)
        return
      }

      console.log('✅ Loaded comments:', commentsData?.length || 0, 'comments')
      
      // Convert database comments to UI format
      const uiComments = (commentsData || []).map((comment: any) => ({
        id: comment.id,
        author: {
          id: comment.author_id,
          name: comment.users?.full_name || comment.users?.email || 'Unknown User',
          initials: (comment.users?.full_name || comment.users?.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          email: comment.users?.email
        },
        content: comment.content,
        timestamp: new Date(comment.created_at),
        editedAt: comment.updated_at !== comment.created_at ? new Date(comment.updated_at) : undefined,
        uploadStatus: 'success' as const
      }))

      setComments(uiComments)
      console.log('✅ Comments state updated via loadTaskComments:', uiComments)
      
    } catch (error) {
      console.error('❌ Error in loadTaskComments:', error)
    }
  }, [])

  // Function to reset all form state to defaults
  const resetFormState = useCallback(() => {
    setFormData({
      title: "",
      description: "",
      status: "Todo",
      priority: "Medium", 
      startDate: undefined,
      dueDate: undefined,
      department: "",
    })
    setSubtasks([])
    setComments([])
    setAttachments([])
    setSelectedAssignees([])
    setAttachmentForm({
      description: "",
      link: "",
    })
    setError(null)
    setAssigneeSearchTerm("")
  }, [])

  // Track the current task ID to detect task changes
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  
  // Load current assignees when editing a task OR reset when creating new task
  useEffect(() => {
    // Reset comments loaded flag when switching to a different task
    if (task?.id !== currentTaskId) {
      setCommentsLoaded(false)
      setCurrentTaskId(task?.id || null)
    }
    
    if (task && mode === "edit") {
      const assignees = task.assignees || []
      // Ensure no duplicates
      const uniqueAssignees = [...new Set(assignees)]
      setSelectedAssignees(uniqueAssignees)
      
      // Load subtasks and comments from the task
      console.log('🔄 TASK MODAL - Syncing subtasks from task object:', task.subtasks?.length || 0)
      if (task.subtasks) {
        setSubtasks(task.subtasks)
      }
      
      // Use comments from task if available, otherwise fetch from database
      // Only load comments if they haven't been loaded yet to prevent overriding user additions
      if (!commentsLoaded) {
        setCommentsLoaded(true) // Set flag immediately to prevent multiple loads
        if (task.comments && task.comments.length > 0) {
          console.log('🔄 Using comments from task object:', task.comments.length)
          setComments(task.comments)
        } else if (task.id) {
          console.log('🔄 No comments in task object, fetching from database')
          loadTaskComments(task.id)
        }
      } else {
        console.log('🔄 Comments already loaded, skipping reset to preserve user additions')
      }
    } else if (mode === "create" && open && !hasInitialized) {
      // Reset form ONLY when modal first opens in create mode, not on every re-render
      console.log('🔄 TASK MODAL - Resetting form for new task creation')
      resetFormState()
      setHasInitialized(true)
    }
  }, [task, mode, open]) // Removed loadTaskComments and resetFormState from dependencies

  // Refresh subtasks when modal opens in edit mode
  useEffect(() => {
    if (open && task && mode === "edit" && fetchSubtasks) {
      console.log('🔄 TASK MODAL - Fetching fresh subtasks from database...')
      fetchSubtasks(task.id).then(() => {
        console.log('✅ TASK MODAL - Subtasks fetched successfully')
        // Note: We don't need to update local state here because
        // the parent task object should be updated with the latest subtasks
        // and the modal will re-render with the updated task.subtasks
      })
    }
  }, [open, task, mode, fetchSubtasks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear any previous errors
    setError(null)
    
    // Validate required fields
    if (!formData.title.trim()) {
      setError('Task title is required')
      return
    }

    if (!formData.department) {
      setError('Department is required')
      return
    }

    // Process attachments for database storage
    const documentLinks = attachments.map(att => att.link).filter(link => link.trim() !== '')
    
    // Ensure assignees are unique
    const uniqueAssignees = [...new Set(selectedAssignees)]
    
    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status as "Todo" | "In Progress" | "Completed",
      priority: formData.priority as "Low" | "Medium" | "High" | "Critical",
      startDate: formData.startDate?.toISOString().split("T")[0],
      dueDate: formData.dueDate?.toISOString().split("T")[0],
      department: formData.department,
      assignees: uniqueAssignees,
      subtasks: mode === "create" ? [] : subtasks, // NEW: Empty subtasks for creation mode
      comments,
      attachments,
      documentLinks, // Add processed document links for database
    }

    if (mode === "create") {
      try {
        console.log('🆕 TASK CREATION - Starting task creation process...')
        console.log('📋 TASK CREATION - Task data:', taskData)
        console.log('🔍 TASK CREATION - Subtasks to create:', subtasks.length)
        console.log('📝 TASK CREATION - Subtasks:', subtasks.map(st => ({ id: st.id, title: st.title })))
        
        // Create task first (without subtasks)
        const result = await createTaskWithAssignees(taskData)
        console.log('✅ TASK CREATION - Task created:', result?.id)
        
        if (result && subtasks.length > 0) {
          console.log('🔄 TASK CREATION - Creating subtasks for task:', result.id)
          
          // NEW: Create subtasks after task creation
          const subtaskPromises = subtasks.map(async (subtask, index) => {
            const subtaskData = {
              task_id: result.id, // Real task ID now available
              title: subtask.title,
              order_index: index,
              start_date: subtask.startDate ? subtask.startDate.toISOString().split('T')[0] : null,
              end_date: subtask.endDate ? subtask.endDate.toISOString().split('T')[0] : null,
              completed: subtask.completed || false,
              created_by: null
            }
            
            console.log('💾 TASK CREATION - Calling addSubtask with:', subtaskData)
            const subtaskResult = await addSubtask(subtaskData)
            console.log('📥 TASK CREATION - addSubtask result:', subtaskResult)
            return subtaskResult
          })
          
          try {
            const createdSubtasks = await Promise.all(subtaskPromises)
            console.log('📋 TASK CREATION - All subtasks created:', createdSubtasks.length)
            console.log('📝 TASK CREATION - Created subtasks:', createdSubtasks)
            
            // NEW: Save subtask comments after subtasks are created
            const subtaskCommentPromises = []
            for (let i = 0; i < subtasks.length; i++) {
              const originalSubtask = subtasks[i]
              const createdSubtask = createdSubtasks[i]
              
              if (originalSubtask.comments && originalSubtask.comments.length > 0 && createdSubtask) {
                
                const commentPromises = originalSubtask.comments.map(async (comment: any) => {
                  const commentData = {
                    subtask_id: createdSubtask.id, // Real subtask ID now available
                    content: comment.text || comment.content,
                    author_id: comment.author?.id || comment.author, // Handle both structures
                    is_internal: false
                  }
                  
                  return await addComment(commentData)
                })
                
                subtaskCommentPromises.push(...commentPromises)
              }
            }
            
            if (subtaskCommentPromises.length > 0) {
              try {
                await Promise.all(subtaskCommentPromises)
              } catch (commentError) {
                console.error('❌ Error saving subtask comments:', commentError)
                setError('Task created but some subtask comments failed to save.')
              }
            }
            
          } catch (subtaskError) {
            console.error('❌ Error creating subtasks:', subtaskError)
            // Task is created, but show warning about subtasks
            setError('Task created but some subtasks failed to save. Please edit the task to add them.')
          }
        }

        // NEW: Save task-level comments after task creation
        if (result && comments.length > 0) {
          
          const commentPromises = comments.map(async (comment) => {
            const commentData = {
              task_id: result.id, // Real task ID now available
              content: comment.content,
              author_id: comment.author.id,
              is_internal: false
            }
            
            return await addComment(commentData)
          })
          
          try {
            await Promise.all(commentPromises)
          } catch (commentError) {
            console.error('❌ Error saving task comments:', commentError)
            // Task is created, but show warning about comments
            setError('Task created but some comments failed to save.')
          }
                }
        
        if (result) {
          // If we created subtasks, we need to refresh the task data to include them
          if (subtasks.length > 0) {
            console.log('🔄 TASK CREATION - Refreshing task data to include new subtasks...')
            // Give a moment for the database transactions to complete
            await new Promise(resolve => setTimeout(resolve, 500))
            // Explicitly refresh the task list to ensure new subtasks are included
            await fetchTasks()
            console.log('✅ TASK CREATION - Task list refreshed')
          }
          
          resetFormState() // Reset form state before closing
          setHasInitialized(false) // Reset initialization flag
          setCommentsLoaded(false) // Reset comments loaded flag
          onOpenChange(false)
        } else {
          setError('Failed to create task. Please try again.')
        }
        
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      }
    } else if (mode === "edit" && task) {
      try {
        // Update the task first
        const result = await updateTask(task.id, taskData)
        if (result) {
          
          // Update assignments separately
          if (JSON.stringify(selectedAssignees.sort()) !== JSON.stringify((task.assignees || []).sort())) {
            const assignmentResult = await updateTaskAssignments(task.id, selectedAssignees)
            if (!assignmentResult) {
              console.warn('⚠️ Task updated but assignment update failed')
              setError('Task updated but failed to update assignees. Please try again.')
              return
            }
          }
          
          onOpenChange(false)
        } else {
          setError('Failed to update task. Please try again.')
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      }
    }
  }

  const toggleAssignee = (memberId: string) => {
    setSelectedAssignees((prev) => {
      const newAssignees = prev.includes(memberId) 
        ? prev.filter((id) => id !== memberId) 
        : [...prev, memberId]
      
      // Ensure no duplicates
      const uniqueAssignees = [...new Set(newAssignees)]
      
      return uniqueAssignees
    })
  }

  const handleDeleteTask = () => {
    if (task?.id) {
      deleteTask(task.id)
    }
    setShowDeleteConfirm(false)
    onOpenChange(false)
  }

  const handleSubtaskCommentClick = (subtaskId: string) => {
    // This function is no longer needed as comments are handled in subtask list modal
  }

  const closeCommentSidebar = () => {
    // This function is no longer needed
  }

  const selectedSubtask = null // No longer needed

  const handleSubtaskCommentsChange = (subtaskId: string, newComments: any[]) => {
    // This function is no longer needed
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      // Blur the input to remove focus
      ;(e.target as HTMLInputElement).blur()
    }
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Allow Shift+Enter for new lines in textarea, but prevent plain Enter from submitting
      return
    }
    if (e.key === "Enter" && e.ctrlKey) {
      // Allow Ctrl+Enter to submit form from textarea
      e.preventDefault()
      e.stopPropagation()
      handleSubmit(e as any)
    }
  }

  const handleAddAttachment = () => {
    if (attachmentForm.description.trim() && attachmentForm.link.trim()) {
      const newAttachment = {
        id: crypto.randomUUID(),
        description: attachmentForm.description.trim(),
        link: attachmentForm.link.trim(),
        createdAt: new Date().toISOString(),
      }
      setAttachments((prev) => [...prev, newAttachment])
      setAttachmentForm({ description: "", link: "" })
      setShowAttachmentPopup(false)
    }
  }

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== attachmentId))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 lg:p-8">
          <DialogHeader className="pb-4 sm:pb-6">
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              {mode === "create" ? "Create New Task" : "Edit Task"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error creating task</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 sm:gap-8 lg:gap-12">
              <div className="space-y-6 sm:space-y-8">
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Task Title
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Enter task title..."
                    className="h-10 sm:h-12 text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Enter task description..."
                    rows={4}
                    className="resize-none text-sm sm:text-base min-h-[100px] sm:min-h-[120px]"
                  />
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <SubtaskList
                    subtasks={subtasks}
                    taskId={task?.id || 'temp-task-id'} // Pass task ID or temporary ID for new tasks
                    onSubtasksChange={debugSetSubtasks}
                    onCommentClick={handleSubtaskCommentClick}
                    selectedCommentSubtask={null} // No longer needed
                    isTaskCreation={mode === "create"} // NEW: Pass creation mode flag
                  />
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="comments" className="text-sm font-medium">Comments</Label>
                  <div className="border-[--border] rounded-lg p-4">
                    <CommentsSection
                      comments={comments}
                      onCommentsChange={setComments}
                      taskId={task?.id || 'temp-task-id'}
                      isTaskCreation={mode === "create"}
                      placeholder="Add a comment to this task..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                    <Select value={formData.status} onValueChange={(value: "Todo" | "In Progress" | "Completed") => setFormData((prev) => ({ ...prev, status: value }))}>
                      <SelectTrigger id="status" name="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todo">Todo</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value: "Low" | "Medium" | "High" | "Critical") => setFormData((prev) => ({ ...prev, priority: value }))}>
                      <SelectTrigger id="priority" name="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assignees Section - Moved below Status and Priority */}
                <div className="space-y-3">
                  <Label htmlFor="assignees" className="text-sm font-medium">Assignees</Label>
                  
                  {/* Current Assignees - Only Avatars */}
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(selectedAssignees)].map((assigneeId, index) => {
                      const member = teamMembers.find((m) => m.id === assigneeId)
                      return member ? (
                        <button
                          key={`${assigneeId}-${index}`}
                          type="button"
                          onClick={() => toggleAssignee(member.id)}
                          className="relative"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      ) : null
                    })}

                    {/* Add Assignee + Button */}
                    <Popover open={showAssigneeDropdown} onOpenChange={(open) => {
                      setShowAssigneeDropdown(open)
                      if (!open) setAssigneeSearchTerm("")
                    }}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center"
                          title="Add assignee"
                        >
                          <span className="text-lg font-bold text-muted-foreground hover:text-primary">+</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2">
                        <div className="space-y-1">
                          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b">
                            Select Team Member
                          </div>
                          
                          {/* Search Bar */}
                          <div className="px-2 py-1">
                            <Input
                              id="assignee-search"
                              name="assignee-search"
                              type="text"
                              placeholder="Search team members..."
                              value={assigneeSearchTerm}
                              className="h-8 text-sm"
                              onChange={(e) => setAssigneeSearchTerm(e.target.value)}
                            />
                          </div>
                          
                          {/* Team Member Dropdown */}
                          <div className="max-h-48 overflow-y-auto">
                            {teamMembers
                              .filter(member =>
                                assigneeSearchTerm === "" ||
                                member.full_name.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                                member.role.toLowerCase().includes(assigneeSearchTerm.toLowerCase())
                              )
                              .map((member) => {
                              const isSelected = selectedAssignees.includes(member.id)
                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => toggleAssignee(member.id)}
                                  className={cn(
                                    "flex items-center gap-3 w-full p-2 rounded-md text-left text-sm transition-colors hover:bg-muted/50",
                                    isSelected ? "bg-primary/10 text-primary" : "text-foreground"
                                  )}
                                >
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{member.full_name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                                  </div>
                                  {isSelected && (
                                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                      <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                            
                            {/* No Results Message */}
                            {teamMembers.filter(member =>
                              assigneeSearchTerm === "" ||
                              member.full_name.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                              member.role.toLowerCase().includes(assigneeSearchTerm.toLowerCase())
                            ).length === 0 && assigneeSearchTerm !== "" && (
                              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                No team members found matching "{assigneeSearchTerm}"
                              </div>
                            )}
                          </div>
                          
                          {/* Clear All Option */}
                          {selectedAssignees.length > 0 && (
                            <>
                              <div className="border-t pt-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedAssignees([])}
                                  className="w-full p-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors text-center"
                                >
                                  Clear all assignees
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="start-date"
                          name="start-date"
                          variant="outline"
                          className={cn(
                            "w-full h-10 justify-start text-left font-normal text-sm",
                            !formData.startDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? format(formData.startDate, "MMM do, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => setFormData((prev) => ({ ...prev, startDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due-date" className="text-sm font-medium">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="due-date"
                          name="due-date"
                          variant="outline"
                          className={cn(
                            "w-full h-10 justify-start text-left font-normal text-sm",
                            !formData.dueDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dueDate ? format(formData.dueDate, "MMM do, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate}
                          onSelect={(date) => setFormData((prev) => ({ ...prev, dueDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}>
                    <SelectTrigger id="department" name="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Quality">Quality</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Safety">Safety</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attachments" className="text-sm font-medium">Attachments</Label>
                  <div className="space-y-3">
                    <Button
                      id="attachments"
                      name="attachments"
                      type="button"
                      variant="outline"
                      onClick={() => setShowAttachmentPopup(true)}
                      className="w-full h-10 justify-start text-left font-normal text-sm"
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Add Attachment
                    </Button>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          {attachments.length} attachment{attachments.length !== 1 ? 's' : ''} added
                        </div>
                        {attachments.map((attachment) => (
                          <div key={attachment.id} className="border-[--border] rounded-lg p-3 space-y-2 bg-muted/30">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-sm font-medium text-foreground truncate">{attachment.description}</p>
                                </div>
                                <a
                                  href={attachment.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline break-all hover:bg-blue-50 px-1 py-0.5 rounded"
                                >
                                  {attachment.link}
                                </a>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAttachment(attachment.id)}
                                className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0"
                                title="Remove attachment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t-[--border]">
              <div>
                {mode === "edit" && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 h-10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Task
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setHasInitialized(false); setCommentsLoaded(false); onOpenChange(false) }} className="px-6 h-10">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 px-6 h-10"
                  disabled={assignmentLoading}
                >
                  {assignmentLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteTask}>
                Delete Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAttachmentPopup} onOpenChange={setShowAttachmentPopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Add Attachment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attachment-description" className="text-sm font-medium">
                Description *
              </Label>
              <Input
                id="attachment-description"
                value={attachmentForm.description}
                onChange={(e) => setAttachmentForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Project Requirements Document, Design Mockup..."
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment-link" className="text-sm font-medium">
                Link/URL *
              </Label>
              <Input
                id="attachment-link"
                value={attachmentForm.link}
                onChange={(e) => setAttachmentForm((prev) => ({ ...prev, link: e.target.value }))}
                placeholder="https://drive.google.com/... or any URL"
                className="w-full"
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">i</span>
                </div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Supported attachment types:</p>
                  <ul className="text-xs space-y-1 text-blue-700">
                    <li>• Google Drive, OneDrive, Dropbox links</li>
                    <li>• GitHub repositories, Jira tickets</li>
                    <li>• Any web URL or document link</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAttachmentPopup(false)
                  setAttachmentForm({ description: "", link: "" })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAttachment}
                disabled={!attachmentForm.description.trim() || !attachmentForm.link.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Attachment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
