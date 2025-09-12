"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, MessageCircle, Users, CalendarIcon, Send, X, Plus, RotateCcw, Check } from "lucide-react"
import { format } from "date-fns"
import { useTeamMembers } from "@/hooks/use-team-members"
import { useSubtaskAssignments } from "@/hooks/use-subtask-assignments"
import { useTaskContext } from "@/contexts/task-context"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { SubtaskCommentsModal } from "@/components/subtask-comments-modal"

interface SubtaskComment {
  id: string
  author: {
    id: string
    name: string
    initials: string
    email?: string
  }
  content: string
  timestamp: Date
  editedAt?: Date
  uploadStatus?: 'uploading' | 'success' | 'failed'
  isTemporary?: boolean
}

interface Subtask {
  id: string
  title: string
  completed: boolean
  assignees?: string[]
  comments: SubtaskComment[]
  startDate?: Date
  endDate?: Date
  task_id?: string
  completed_at?: string // Added for completion timestamp
}

interface SubtaskListProps {
  subtasks: Subtask[]
  taskId: string // Add task ID prop
  onSubtasksChange: (subtasks: Subtask[]) => void
  onCommentClick?: (subtaskId: string) => void
  selectedCommentSubtask?: string | null
  isTaskCreation?: boolean // NEW: Flag to detect task creation mode
}

export function SubtaskList({ 
  subtasks, 
  taskId, 
  onSubtasksChange, 
  onCommentClick, 
  selectedCommentSubtask, 
  isTaskCreation = false 
}: SubtaskListProps) {
  const safeSubtasks = Array.isArray(subtasks) ? subtasks : []
  const { teamMembers, loading: teamMembersLoading } = useTeamMembers()
  const { 
    getSubtaskAssignments, 
    assignTeamMembersToSubtask, 
    loading: assignmentLoading 
  } = useSubtaskAssignments()
  const { addSubtask, updateSubtask: updateSubtaskInDB, addComment: addCommentDB, updateComment: updateCommentDB, deleteComment: deleteCommentDB, deleteSubtask: deleteSubtaskFromDB } = useTaskContext()
  const { user } = useAuth()

  // New subtask creation state
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false)
  const [newSubtaskData, setNewSubtaskData] = useState({
    title: "",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    assignees: [] as string[],
    comments: [] as SubtaskComment[]
  })
  
  // Existing subtask state
  const [assigneeDropdown, setAssigneeDropdown] = useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState<{ subtaskId: string; type: "start" | "end" } | null>(null)
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState("")
  const [commentModalOpen, setCommentModalOpen] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [editingComment, setEditingComment] = useState<{ subtaskId: string; commentId: string; text: string } | null>(null)
  const [updatingSubtask, setUpdatingSubtask] = useState<string | null>(null)

  // New subtask creation functions
  const startCreatingSubtask = () => {
    setIsCreatingSubtask(true)
    setNewSubtaskData({
      title: "",
      startDate: undefined,
      endDate: undefined,
      assignees: [],
      comments: []
    })
  }

  const cancelCreatingSubtask = () => {
    setIsCreatingSubtask(false)
    setNewSubtaskData({
      title: "",
      startDate: undefined,
      endDate: undefined,
      assignees: [],
      comments: []
    })
  }

  const handleAddSubtask = async () => {
    if (newSubtaskData.title.trim()) {
      
      // NEW LOGIC: Check if we're in task creation mode
      if (isTaskCreation || taskId === 'temp-task-id' || taskId.startsWith('temp-')) {
        console.log('🆕 CREATION MODE - Creating temporary subtask...')
        console.log('🔍 CREATION MODE - Task ID:', taskId)
        console.log('🔍 CREATION MODE - Is Task Creation:', isTaskCreation)
        console.log('🔍 CREATION MODE - Current subtasks count:', safeSubtasks.length)
        console.log('🔍 CREATION MODE - New subtask data:', newSubtaskData)
        
        // CREATION MODE: Store in local state only
        
        // Generate temporary ID for UI purposes
        const tempSubtask: Subtask = {
          id: `temp-subtask-${Date.now()}-${Math.random()}`, // Temporary ID
          title: newSubtaskData.title.trim(),
          completed: false,
          assignees: newSubtaskData.assignees,
          comments: newSubtaskData.comments,
          startDate: newSubtaskData.startDate,
          endDate: newSubtaskData.endDate,
          task_id: taskId // Will be temp ID for now
        }
        
        console.log('✅ CREATION MODE - Generated temp subtask:', tempSubtask)
        
        // Add to local state immediately
        const newSubtasksArray = [...safeSubtasks, tempSubtask]
        console.log('🔄 CREATION MODE - Calling onSubtasksChange with:', newSubtasksArray.length, 'subtasks')
        onSubtasksChange(newSubtasksArray)
        console.log('✅ CREATION MODE - Subtask creation completed')
        cancelCreatingSubtask()
        
        return
      }
      
      // EDIT MODE: Save to database immediately (existing logic)
      try {
        console.log('🔄 SUBTASK SAVE - Starting database save process...')
        console.log('🔍 SUBTASK SAVE - Task ID:', taskId)
        console.log('🔍 SUBTASK SAVE - Is Task Creation?', isTaskCreation)
        console.log('🔍 SUBTASK SAVE - Subtask Data:', newSubtaskData)
        
        // Use the taskId prop passed from parent component
        if (!taskId) {
          console.error('❌ Cannot create subtask: No task ID provided')
          return
        }
        
        // Create subtask data for database with detailed logging
        const startDateStr = newSubtaskData.startDate ? (() => {
          if (newSubtaskData.startDate instanceof Date) {
            const year = newSubtaskData.startDate.getFullYear();
            const month = String(newSubtaskData.startDate.getMonth() + 1).padStart(2, '0');
            const day = String(newSubtaskData.startDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          return newSubtaskData.startDate;
        })() : null;
        
        const endDateStr = newSubtaskData.endDate ? (() => {
          if (newSubtaskData.endDate instanceof Date) {
            const year = newSubtaskData.endDate.getFullYear();
            const month = String(newSubtaskData.endDate.getMonth() + 1).padStart(2, '0');
            const day = String(newSubtaskData.endDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          return newSubtaskData.endDate;
        })() : null;
        
        const subtaskData = {
          task_id: taskId,
          title: newSubtaskData.title.trim(),
          order_index: safeSubtasks.length,
          start_date: startDateStr,
          end_date: endDateStr,
          completed: false,
          created_by: null // Will be set by the database trigger
        }
        
        // Save subtask to database
        console.log('💾 SUBTASK SAVE - Calling addSubtask with data:', subtaskData)
        const newSubtask = await addSubtask(subtaskData)
        console.log('📥 SUBTASK SAVE - Database response:', newSubtask)
        
        if (newSubtask) {
          // Convert database subtask to UI format
          const uiSubtask: Subtask = {
            id: newSubtask.id,
            title: newSubtask.title,
            completed: newSubtask.completed,
            assignees: newSubtaskData.assignees,
            comments: newSubtaskData.comments,
            startDate: newSubtask.start_date ? new Date(newSubtask.start_date) : undefined,
            endDate: newSubtask.end_date ? new Date(newSubtask.end_date) : undefined,
            task_id: newSubtask.task_id
          }
          
          // Add to local state
          console.log('✅ SUBTASK SAVE - Adding to local state:', uiSubtask)
          console.log('🔍 SUBTASK SAVE - Current subtasks count:', safeSubtasks.length)
          onSubtasksChange([...safeSubtasks, uiSubtask])
          console.log('✅ SUBTASK SAVE - Subtask creation completed successfully')
          cancelCreatingSubtask()
        } else {
          console.error('❌ Failed to create subtask in database')
        }
      } catch (error) {
        console.error('❌ Error creating subtask:', error)
      }
    }
  }

  const updateSubtask = async (id: string, updates: Partial<Subtask>) => {
    // Update local state immediately for UI responsiveness
    onSubtasksChange(safeSubtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...updates } : subtask)))
    
    // Skip database updates for temporary subtasks (during task creation)
    if (id.startsWith('temp-subtask-')) {
      console.log('🔄 Skipping database update for temporary subtask:', id)
      return
    }
    
    // If this is a completion update or date update, persist it to the database
    if ('completed' in updates || 'startDate' in updates || 'endDate' in updates) {
      try {
        setUpdatingSubtask(id)
        console.log('🔄 Updating subtask in database:', { id, updates })
        
        // Prepare database update data
        const dbUpdates: any = {
          updated_at: new Date().toISOString()
        }
        
        // Handle completion updates
        if ('completed' in updates) {
          dbUpdates.completed = updates.completed
          // Set completed_at timestamp when completing
          if (updates.completed) {
            dbUpdates.completed_at = new Date().toISOString()
          } else {
            dbUpdates.completed_at = null
          }
        }
        
        // Handle date updates
        if ('startDate' in updates) {
          if (updates.startDate instanceof Date) {
            // Use local date methods to prevent timezone shift
            const year = updates.startDate.getFullYear();
            const month = String(updates.startDate.getMonth() + 1).padStart(2, '0');
            const day = String(updates.startDate.getDate()).padStart(2, '0');
            dbUpdates.start_date = `${year}-${month}-${day}`;
          } else {
            dbUpdates.start_date = updates.startDate;
          }
        }
        
        if ('endDate' in updates) {
          if (updates.endDate instanceof Date) {
            // Use local date methods to prevent timezone shift
            const year = updates.endDate.getFullYear();
            const month = String(updates.endDate.getMonth() + 1).padStart(2, '0');
            const day = String(updates.endDate.getDate()).padStart(2, '0');
            dbUpdates.end_date = `${year}-${month}-${day}`;
          } else {
            dbUpdates.end_date = updates.endDate;
          }
        }
        
        console.log('💾 Database updates:', dbUpdates)
        
        // Update in database
        const result = await updateSubtaskInDB(id, dbUpdates)
        
        if (result) {
          console.log('✅ Subtask updated successfully in database:', result)
        } else {
          console.error('❌ Failed to update subtask in database')
          // Revert local state on error
          const originalSubtask = safeSubtasks.find(s => s.id === id)
          if (originalSubtask) {
            onSubtasksChange(safeSubtasks.map((subtask) => 
              subtask.id === id ? originalSubtask : subtask
            ))
          }
        }
      } catch (error) {
        console.error('❌ Error updating subtask:', error)
        // Revert local state on error
        const originalSubtask = safeSubtasks.find(s => s.id === id)
        if (originalSubtask) {
          onSubtasksChange(safeSubtasks.map((subtask) => 
            subtask.id === id ? originalSubtask : subtask
          ))
        }
      } finally {
        setUpdatingSubtask(null)
      }
    }
  }

  const deleteSubtask = async (id: string) => {
    // Store original subtasks for potential restoration
    const originalSubtasks = [...safeSubtasks]
    
    // Optimistic UI update
    onSubtasksChange(safeSubtasks.filter((subtask) => subtask.id !== id))
    
    // If this is a temporary subtask, just remove from local state
    if (id.startsWith('temp-subtask-')) {
      console.log('🔄 Skipping database deletion for temporary subtask:', id)
      return
    }

    try {
      // Delete from database
      const success = await deleteSubtaskFromDB(id)
      if (!success) {
        console.error('❌ Failed to delete subtask from database')
        // Revert local state on error
        onSubtasksChange(originalSubtasks)
      }
    } catch (error) {
      console.error('Error deleting subtask:', error)
      // Revert local state on error
      onSubtasksChange(originalSubtasks)
    }
  }

  const toggleSubtaskAssignee = async (subtaskId: string, memberId: string) => {
    const subtask = safeSubtasks.find((s) => s.id === subtaskId)
    if (subtask) {
      const currentAssignees = subtask.assignees || []
      const newAssignees = currentAssignees.includes(memberId)
        ? currentAssignees.filter((id) => id !== memberId)
        : [...currentAssignees, memberId]
      
      // Update local state immediately for UI responsiveness
      updateSubtask(subtaskId, { assignees: newAssignees })
      
      // Skip database update for temporary subtasks
      if (subtaskId.startsWith('temp-subtask-') || isTaskCreation) {
        console.log('🔄 SUBTASK ASSIGN - Skipping database update for temporary subtask:', subtaskId)
        return
      }
      
      // Update backend assignments
      try {
        await assignTeamMembersToSubtask(subtaskId, newAssignees)
      } catch (error) {
        console.error('Failed to update subtask assignments:', error)
        // Revert local state on error
        updateSubtask(subtaskId, { assignees: currentAssignees })
      }
    }
  }

  // New subtask assignee management
  const toggleNewSubtaskAssignee = (memberId: string) => {
    setNewSubtaskData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(memberId)
        ? prev.assignees.filter(id => id !== memberId)
        : [...prev.assignees, memberId]
    }))
  }

  const handleCommentClick = (subtaskId: string) => {
    setCommentModalOpen(subtaskId)
    setNewCommentText("")
  }

  const addComment = async (subtaskId: string) => {
    if (!newCommentText.trim() || !user) return

    // Create optimistic UI comment
    const tempComment: SubtaskComment = {
      id: `temp-comment-${Date.now()}`,
      content: newCommentText.trim(),
      author: {
        id: user.id,
        name: (user as any)?.user_metadata?.full_name || user.email || 'Current User',
        initials: ((user as any)?.user_metadata?.full_name || user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        email: user.email
      },
      timestamp: new Date(),
      uploadStatus: 'uploading',
      isTemporary: true
    }

    // Update subtask comments optimistically
    const subtask = safeSubtasks.find((s) => s.id === subtaskId)
    if (subtask) {
      const updatedComments = [...(subtask.comments || []), tempComment]
      
      // Update in parent component immediately
      const updatedSubtasks = safeSubtasks.map(s => 
        s.id === subtaskId ? { ...s, comments: updatedComments } : s
      )
      onSubtasksChange(updatedSubtasks)
      setNewCommentText("")

      // If in task creation mode, just keep in local state
      if (isTaskCreation) {
        const successComment = { ...tempComment, uploadStatus: 'success' as const, isTemporary: false }
        const finalComments = [...(subtask.comments || []), successComment]
        const finalSubtasks = safeSubtasks.map(s => 
          s.id === subtaskId ? { ...s, comments: finalComments } : s
        )
        onSubtasksChange(finalSubtasks)
        return
      }

      try {
        // Save to database
        const commentData = {
          subtask_id: subtaskId,
          content: tempComment.content,
          author_id: user.id,
          is_internal: false
        }
        
        const dbComment = await addCommentDB(commentData)
        
        if (dbComment) {
          // Replace temp comment with real one
          const realComment: SubtaskComment = {
            id: dbComment.id,
            content: dbComment.content,
            author: tempComment.author,
            timestamp: new Date(dbComment.created_at),
            uploadStatus: 'success' as const
          }
          
          const finalComments = (subtask.comments || []).map(c => 
            c.id === tempComment.id ? realComment : c
          )
          const finalSubtasks = safeSubtasks.map(s => 
            s.id === subtaskId ? { ...s, comments: finalComments } : s
          )
          onSubtasksChange(finalSubtasks)
        } else {
          throw new Error('Failed to save comment')
        }
      } catch (error) {
        console.error('Error saving subtask comment:', error)
        // Mark as failed
        const failedComment = { ...tempComment, uploadStatus: 'failed' as const }
        const failedComments = (subtask.comments || []).map(c => 
          c.id === tempComment.id ? failedComment : c
        )
        const failedSubtasks = safeSubtasks.map(s => 
          s.id === subtaskId ? { ...s, comments: failedComments } : s
        )
        onSubtasksChange(failedSubtasks)
      }
    }
  }

  const deleteComment = async (subtaskId: string, commentId: string) => {
    const subtask = safeSubtasks.find((s) => s.id === subtaskId)
    if (!subtask) return

    const comment = subtask.comments?.find(c => c.id === commentId)
    if (!comment) return

    // Remove from UI immediately (optimistic delete)
    const updatedComments = (subtask.comments || []).filter((c) => c.id !== commentId)
    const updatedSubtasks = safeSubtasks.map(s => 
      s.id === subtaskId ? { ...s, comments: updatedComments } : s
    )
    onSubtasksChange(updatedSubtasks)

    // If temporary comment or in creation mode, just remove from UI
    if (comment.isTemporary || isTaskCreation) {
      return
    }

    try {
      // Delete from database
      const success = await deleteCommentDB(commentId)
      if (!success) {
        // Restore comment if delete failed
        const restoredComments = [...updatedComments, comment]
        const restoredSubtasks = safeSubtasks.map(s => 
          s.id === subtaskId ? { ...s, comments: restoredComments } : s
        )
        onSubtasksChange(restoredSubtasks)
      }
    } catch (error) {
      console.error('Error deleting subtask comment:', error)
      // Restore comment on error
      const restoredComments = [...updatedComments, comment]
      const restoredSubtasks = safeSubtasks.map(s => 
        s.id === subtaskId ? { ...s, comments: restoredComments } : s
      )
      onSubtasksChange(restoredSubtasks)
    }
  }

  const retryComment = async (subtaskId: string, commentId: string) => {
    const subtask = safeSubtasks.find((s) => s.id === subtaskId)
    if (!subtask) return

    const comment = subtask.comments?.find(c => c.id === commentId)
    if (!comment) return

    // Mark as uploading
    const uploadingComment = { ...comment, uploadStatus: 'uploading' as const }
    const uploadingComments = (subtask.comments || []).map(c => 
      c.id === commentId ? uploadingComment : c
    )
    const uploadingSubtasks = safeSubtasks.map(s => 
      s.id === subtaskId ? { ...s, comments: uploadingComments } : s
    )
    onSubtasksChange(uploadingSubtasks)

    try {
      // Retry save to database
      const commentData = {
        subtask_id: subtaskId,
        content: comment.content,
        author_id: user?.id || '',
        is_internal: false
      }
      
      const dbComment = await addCommentDB(commentData)
      
      if (dbComment) {
        // Replace with real comment
        const realComment: SubtaskComment = {
          id: dbComment.id,
          content: dbComment.content,
          author: comment.author,
          timestamp: new Date(dbComment.created_at),
          uploadStatus: 'success' as const
        }
        
        const finalComments = (subtask.comments || []).map(c => 
          c.id === commentId ? realComment : c
        )
        const finalSubtasks = safeSubtasks.map(s => 
          s.id === subtaskId ? { ...s, comments: finalComments } : s
        )
        onSubtasksChange(finalSubtasks)
      } else {
        throw new Error('Failed to save comment')
      }
    } catch (error) {
      console.error('Error retrying subtask comment:', error)
      // Mark as failed again
      const failedComment = { ...comment, uploadStatus: 'failed' as const }
      const failedComments = (subtask.comments || []).map(c => 
        c.id === commentId ? failedComment : c
      )
      const failedSubtasks = safeSubtasks.map(s => 
        s.id === subtaskId ? { ...s, comments: failedComments } : s
      )
      onSubtasksChange(failedSubtasks)
    }
  }

  const startEditingComment = (subtaskId: string, commentId: string, currentText: string) => {
    setEditingComment({ subtaskId, commentId, text: currentText })
  }

  const saveEditedComment = (subtaskId: string, commentId: string) => {
    if (editingComment && editingComment.text.trim()) {
      const subtask = safeSubtasks.find((s) => s.id === subtaskId)
      if (subtask) {
        const updatedComments = subtask.comments.map((c) => 
          c.id === commentId 
            ? { ...c, text: editingComment.text.trim(), editedAt: new Date(), isEditing: false }
            : c
        )
        updateSubtask(subtaskId, { comments: updatedComments })
        setEditingComment(null)
      }
    }
  }

  const cancelEditingComment = () => {
    setEditingComment(null)
  }

  const getUploadStatusIcon = (status?: string) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full" />
      case 'failed':
        return <X className="w-3 h-3 text-red-500" />
      case 'success':
        return <Check className="w-3 h-3 text-green-500" />
      default:
        return null
    }
  }

  const handleSubtaskTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  const handleCommentKeyDown = (e: React.KeyboardEvent, subtaskId: string) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      addComment(subtaskId)
    }
  }

  // Handle bulk completion updates
  const handleBulkCompletion = async (subtaskIds: string[], completed: boolean) => {
    const updates = subtaskIds.map(id => ({ id, completed }))
    
    // Update local state immediately
    updates.forEach(({ id, completed }) => {
      onSubtasksChange(safeSubtasks.map((subtask) => 
        subtask.id === id ? { ...subtask, completed } : subtask
      ))
    })
    
    // Update database for each subtask
    const promises = updates.map(async ({ id, completed }) => {
      try {
        setUpdatingSubtask(id)
        const dbUpdates: any = {
          completed,
          updated_at: new Date().toISOString()
        }
        
        if (completed) {
          dbUpdates.completed_at = new Date().toISOString()
        } else {
          dbUpdates.completed_at = null
        }
        
        const result = await updateSubtaskInDB(id, dbUpdates)
        return { id, success: !!result, error: null }
      } catch (error) {
        console.error(`❌ Error updating subtask ${id}:`, error)
        return { id, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      } finally {
        setUpdatingSubtask(null)
      }
    })
    
    const results = await Promise.all(promises)
    const failures = results.filter(r => !r.success)
    
    if (failures.length > 0) {
      console.error('❌ Some subtask updates failed:', failures)
      // Revert failed updates
      failures.forEach(({ id }) => {
        onSubtasksChange(safeSubtasks.map((subtask) => 
          subtask.id === id ? { ...subtask, completed: !completed } : subtask
        ))
      })
    }
    
    return results
  }

  return (
    <div className="space-y-4">
      {safeSubtasks.length > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-medium text-foreground">
              Subtasks ({safeSubtasks.length})
            </h3>
            {safeSubtasks.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">
                  {safeSubtasks.filter(s => s.completed).length} completed
                </span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                  {safeSubtasks.filter(s => !s.completed).length} remaining
                </span>
              </div>
            )}
          </div>
          {safeSubtasks.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const incompleteIds = safeSubtasks.filter(s => !s.completed).map(s => s.id)
                  if (incompleteIds.length > 0) {
                    handleBulkCompletion(incompleteIds, true)
                  }
                }}
                disabled={safeSubtasks.every(s => s.completed)}
                className="h-7 px-2 text-xs"
              >
                Complete All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const completedIds = safeSubtasks.filter(s => s.completed).map(s => s.id)
                  if (completedIds.length > 0) {
                    handleBulkCompletion(completedIds, false)
                  }
                }}
                disabled={safeSubtasks.every(s => !s.completed)}
                className="h-7 px-2 text-xs"
              >
                Uncomplete All
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {safeSubtasks.map((subtask, index) => (
          <div key={subtask.id} className="space-y-2">
            <div className="flex items-center gap-4 p-4 border-[--border] rounded-lg bg-background">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground font-medium w-6 flex-shrink-0">{index + 1}.</span>
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={(checked) => updateSubtask(subtask.id, { completed: !!checked })}
                  disabled={updatingSubtask === subtask.id}
                  className={cn(
                    "flex-shrink-0 border-2 border-gray-400 hover:border-gray-500 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                    updatingSubtask === subtask.id && "opacity-50 cursor-not-allowed"
                  )}
                />
                {updatingSubtask === subtask.id && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
                <Input
                  id={`subtask-title-${subtask.id}`}
                  name={`subtask-title-${subtask.id}`}
                  value={subtask.title}
                  onChange={(e) => updateSubtask(subtask.id, { title: e.target.value })}
                  onKeyDown={handleSubtaskTitleKeyDown}
                  className={cn(
                    "flex-1 min-w-0 border-none bg-transparent p-0 focus-visible:ring-0 text-sm transition-all duration-200",
                    subtask.completed && "line-through text-muted-foreground opacity-70"
                  )}
                  placeholder={`Subtask ${index + 1}`}
                />
                {subtask.completed && (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Completed
                    {subtask.completed_at && (
                      <span className="text-green-500 ml-1">
                        {format(new Date(subtask.completed_at), "MMM dd")}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Assignee Avatars */}
                {subtask.assignees && subtask.assignees.length > 0 && (
                  <div className="flex items-center gap-1 mr-2">
                    {subtask.assignees.slice(0, 3).map((assigneeId) => {
                      const assignee = teamMembers.find(member => member.id === assigneeId)
                      return assignee ? (
                        <Avatar key={assigneeId} className="w-6 h-6">
                          <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                            {assignee.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : null
                    })}
                    {subtask.assignees.length > 3 && (
                      <div className="text-xs text-muted-foreground ml-1">
                        +{subtask.assignees.length - 3}
                      </div>
                    )}
                  </div>
                )}
                
                <Popover
                  open={datePickerOpen?.subtaskId === subtask.id && datePickerOpen?.type === "start"}
                  onOpenChange={(open) => setDatePickerOpen(open ? { subtaskId: subtask.id, type: "start" } : null)}
                >
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {subtask.startDate ? format(subtask.startDate, "MMM dd") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={subtask.startDate}
                      onSelect={(date) => {
                        updateSubtask(subtask.id, { startDate: date })
                        setDatePickerOpen(null)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover
                  open={datePickerOpen?.subtaskId === subtask.id && datePickerOpen?.type === "end"}
                  onOpenChange={(open) => setDatePickerOpen(open ? { subtaskId: subtask.id, type: "end" } : null)}
                >
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {subtask.endDate ? format(subtask.endDate, "MMM dd") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={subtask.endDate}
                      onSelect={(date) => {
                        updateSubtask(subtask.id, { endDate: date })
                        setDatePickerOpen(null)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover
                  open={assigneeDropdown === subtask.id}
                  onOpenChange={(open) => {
                    setAssigneeDropdown(open ? subtask.id : null)
                    if (!open) setAssigneeSearchTerm("")
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8">
                      {subtask.assignees && subtask.assignees.length > 0 ? (
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <span className="text-xs font-medium">+{subtask.assignees.length}</span>
                        </div>
                      ) : (
                        <Users className="w-3 h-3 text-muted-foreground" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="space-y-1">
                      <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b">
                        Select Team Member
                      </div>
                      
                      {/* Search Bar */}
                      <div className="px-2 py-1">
                        <Input
                          id="subtask-assignee-search"
                          name="subtask-assignee-search"
                          type="text"
                          placeholder="Search team members..."
                          value={assigneeSearchTerm}
                          className="h-8 text-sm"
                          onChange={(e) => setAssigneeSearchTerm(e.target.value)}
                        />
                      </div>

                      {/* Team Member List */}
                      <div className="max-h-64 overflow-y-auto">
                        {teamMembers
                          .filter(member =>
                            assigneeSearchTerm === "" ||
                            member.full_name.toLowerCase().includes(assigneeSearchTerm.toLowerCase()) ||
                            member.role.toLowerCase().includes(assigneeSearchTerm.toLowerCase())
                          )
                          .map((member) => {
                            const isSelected = subtask.assignees && subtask.assignees.includes(member.id)
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => toggleSubtaskAssignee(subtask.id, member.id)}
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
                      {subtask.assignees && subtask.assignees.length > 0 && (
                        <div className="border-t pt-1">
                          <button
                            type="button"
                            onClick={() => updateSubtask(subtask.id, { assignees: [] })}
                            className="w-full p-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors text-center"
                          >
                            Clear all assignees
                          </button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCommentClick(subtask.id)}
                  className={cn(
                    "h-8 px-2 text-muted-foreground hover:text-foreground",
                    selectedCommentSubtask === subtask.id && "bg-primary/10 text-primary",
                  )}
                >
                  <MessageCircle className="w-3 h-3" />
                  {subtask.comments && subtask.comments.length > 0 && (
                    <span className="ml-1 text-xs">{subtask.comments.length}</span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSubtask(subtask.id)}
                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Add New Subtask Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Add a new subtask</h3>
        
        {!isCreatingSubtask ? (
          <div className="flex gap-2">
            <Input
              id="new-subtask-title"
              name="new-subtask-title"
              placeholder="Add a new subtask"
              onClick={startCreatingSubtask}
              className="flex-1 cursor-pointer"
              readOnly
            />
            <Button 
              type="button" 
              onClick={startCreatingSubtask} 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 p-4 border-[--border] rounded-lg bg-muted/20">
            {/* Title */}
            <div className="space-y-3">
              <Input
                id="new-subtask-title"
                name="new-subtask-title"
                value={newSubtaskData.title}
                onChange={(e) => setNewSubtaskData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter subtask title..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
              />
            </div>

            {/* Action Icons Row */}
            <div className="flex items-center gap-2">
              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-xs"
                    disabled={!newSubtaskData.title.trim()}
                  >
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {newSubtaskData.startDate ? format(newSubtaskData.startDate, "MMM dd") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newSubtaskData.startDate}
                    onSelect={(date) => setNewSubtaskData(prev => ({ ...prev, startDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-xs"
                    disabled={!newSubtaskData.title.trim()}
                  >
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {newSubtaskData.endDate ? format(newSubtaskData.endDate, "MMM dd") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newSubtaskData.endDate}
                    onSelect={(date) => setNewSubtaskData(prev => ({ ...prev, endDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Assignees */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8"
                    disabled={!newSubtaskData.title.trim()}
                  >
                    {newSubtaskData.assignees.length > 0 ? (
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <span className="text-xs font-medium">+{newSubtaskData.assignees.length}</span>
                      </div>
                    ) : (
                      <Users className="w-3 h-3 text-muted-foreground" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="space-y-1">
                    <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b">
                      Select Team Members
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                      {teamMembers.map((member) => {
                        const isSelected = newSubtaskData.assignees.includes(member.id)
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleNewSubtaskAssignee(member.id)}
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
                    </div>

                    {/* Clear All Option */}
                    {newSubtaskData.assignees.length > 0 && (
                      <div className="border-t pt-1">
                        <button
                          type="button"
                          onClick={() => setNewSubtaskData(prev => ({ ...prev, assignees: [] }))}
                          className="w-full p-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors text-center"
                        >
                          Clear all assignees
                        </button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Comments Icon (shows count) */}
              <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
                <MessageCircle className="w-3 h-3" />
                {newSubtaskData.comments.length > 0 && (
                  <span>{newSubtaskData.comments.length}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelCreatingSubtask}
                  className="h-8 px-3"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddSubtask}
                  size="sm"
                  disabled={!newSubtaskData.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700 h-8 px-3"
                >
                  Add Subtask
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {safeSubtasks.length === 0 && !isCreatingSubtask && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">No subtasks yet. Add one above to get started.</p>
        </div>
      )}

      {/* Subtask Comments Modal */}
      {commentModalOpen && (
        <SubtaskCommentsModal
          isOpen={!!commentModalOpen}
          onClose={() => setCommentModalOpen(null)}
          subtaskId={commentModalOpen}
          subtaskTitle={safeSubtasks.find(s => s.id === commentModalOpen)?.title || 'Unknown Subtask'}
          taskId={taskId}
          comments={safeSubtasks.find(s => s.id === commentModalOpen)?.comments || []}
          onCommentsChange={(newComments) => {
            if (commentModalOpen) {
              const updatedSubtasks = safeSubtasks.map(s => 
                s.id === commentModalOpen ? { ...s, comments: newComments } : s
              )
              onSubtasksChange(updatedSubtasks)
            }
          }}
          isTaskCreation={isTaskCreation}
        />
      )}

    </div>
  )
}
