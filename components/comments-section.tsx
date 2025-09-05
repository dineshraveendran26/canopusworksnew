"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Trash2, RotateCcw, Check, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useTaskContext } from "@/contexts/task-context"
import { cn } from "@/lib/utils"

interface DatabaseComment {
  id: string
  task_id?: string
  subtask_id?: string
  author_id: string
  content: string
  is_internal: boolean
  created_at: string
  updated_at: string
  edited_by?: string
}

interface UIComment {
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
  isEditing?: boolean
  uploadStatus?: 'uploading' | 'failed' | 'success'
  isTemporary?: boolean
}

interface CommentsSectionProps {
  comments: UIComment[]
  onCommentsChange: (comments: UIComment[]) => void
  taskId?: string
  subtaskId?: string
  placeholder?: string
  isTaskCreation?: boolean
}

export function CommentsSection({
  comments,
  onCommentsChange,
  taskId,
  subtaskId,
  placeholder = "Add a comment...",
  isTaskCreation = false,
}: CommentsSectionProps) {
  const safeComments = Array.isArray(comments) ? comments : []
  const { user } = useAuth()
  const { addComment, updateComment, deleteComment } = useTaskContext()

  const [newComment, setNewComment] = useState("")
  const [editingComment, setEditingComment] = useState<{ commentId: string; text: string } | null>(null)

  // Convert database comment to UI format
  const mapDatabaseToUI = (dbComment: DatabaseComment, authorName?: string, authorEmail?: string): UIComment => {
    const name = authorName || authorEmail || 'Unknown User'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
    
    return {
      id: dbComment.id,
      author: {
        id: dbComment.author_id,
        name,
        initials,
        email: authorEmail
      },
      content: dbComment.content,
      timestamp: new Date(dbComment.created_at),
      editedAt: dbComment.updated_at !== dbComment.created_at ? new Date(dbComment.updated_at) : undefined,
      uploadStatus: 'success'
    }
  }

  // Convert UI comment to database format
  const mapUIToDatabase = (uiComment: UIComment): Partial<DatabaseComment> => {
    return {
      content: uiComment.content,
      task_id: subtaskId ? undefined : taskId,  // Only set task_id if this is NOT a subtask comment
      subtask_id: subtaskId || undefined,       // Only set subtask_id if this IS a subtask comment
      author_id: uiComment.author.id,
      is_internal: false
    }
  }

  const addCommentHandler = async () => {
    console.log('🔄 addCommentHandler START')
    console.log('📋 Input validation:', { 
      hasNewComment: !!newComment.trim(), 
      newCommentLength: newComment.trim().length,
      hasUser: !!user, 
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (!newComment.trim() || !user) {
      console.log('❌ addCommentHandler: Validation failed')
      return
    }

    console.log('📝 Creating optimistic UI comment...')
    // Create optimistic UI comment
    const tempComment: UIComment = {
      id: `temp-comment-${Date.now()}`,
      author: {
        id: user.id,
        name: (user as any)?.user_metadata?.full_name || user.email || 'Current User',
        initials: ((user as any)?.user_metadata?.full_name || user.email || 'CU').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        email: user.email
      },
      content: newComment.trim(),
      timestamp: new Date(),
      uploadStatus: 'uploading',
      isTemporary: true
    }
    
    console.log('✅ Temp comment created:', tempComment)

    // Add to UI immediately (optimistic update) - newest at bottom
    console.log('🔄 Adding to UI optimistically...')
    onCommentsChange([...safeComments, tempComment])
    setNewComment("")

    // If in creation mode, don't save to database yet
    console.log('🔍 Checking creation mode:', { isTaskCreation, taskId, subtaskId })
    if (isTaskCreation) {
      console.log('🔄 In creation mode - not saving to database yet')
      const successComment = { ...tempComment, uploadStatus: 'success' as const, isTemporary: false }
      onCommentsChange([...safeComments, successComment])
      return
    }

    try {
      console.log('💾 Saving to database...')
      const commentData = mapUIToDatabase(tempComment)
      console.log('📤 Comment data for database:', commentData)
      
      // Save to database
      const dbComment = await addComment(commentData)
      console.log('📥 Database response:', dbComment)
      
      if (dbComment) {
        console.log('✅ Comment saved successfully, updating UI...')
        // Replace temp comment with real one
        const realComment = mapDatabaseToUI(dbComment, tempComment.author.name, tempComment.author.email)
        // Get current comments (including temp comment) and replace temp with real
        const currentComments = [...safeComments, tempComment] // This matches what was set in line 135
        const updatedComments = currentComments.map(c => 
          c.id === tempComment.id ? realComment : c
        )
        onCommentsChange(updatedComments)
        console.log('✅ UI updated with real comment')
      } else {
        throw new Error('Failed to save comment - no data returned')
      }
    } catch (error) {
      console.error('❌ Error saving comment:', error)
      console.error('❌ Error details:', error)
      // Mark as failed
      const failedComment = { ...tempComment, uploadStatus: 'failed' as const }
      const currentComments = [...safeComments, tempComment] // This matches what was set in line 135
      const updatedComments = currentComments.map(c => 
        c.id === tempComment.id ? failedComment : c
      )
      onCommentsChange(updatedComments)
      console.log('🔄 Marked comment as failed')
    }
    
    console.log('🔄 addCommentHandler END')
  }

  const retryComment = async (commentId: string) => {
    const comment = safeComments.find(c => c.id === commentId)
    if (!comment) return

    // Mark as uploading
    const uploadingComment = { ...comment, uploadStatus: 'uploading' as const }
    const updatedComments = safeComments.map(c => 
      c.id === commentId ? uploadingComment : c
    )
    onCommentsChange(updatedComments)

    try {
      // Retry save to database
      const dbComment = await addComment(mapUIToDatabase(comment))
      
      if (dbComment) {
        // Replace with real comment
        const realComment = mapDatabaseToUI(dbComment, comment.author.name, comment.author.email)
        const finalComments = safeComments.map(c => 
          c.id === commentId ? realComment : c
        )
        onCommentsChange(finalComments)
      } else {
        throw new Error('Failed to save comment')
      }
    } catch (error) {
      console.error('Error retrying comment:', error)
      // Mark as failed again
      const failedComment = { ...comment, uploadStatus: 'failed' as const }
      const finalComments = safeComments.map(c => 
        c.id === commentId ? failedComment : c
      )
      onCommentsChange(finalComments)
    }
  }

  const deleteCommentHandler = async (commentId: string) => {
    const comment = safeComments.find(c => c.id === commentId)
    if (!comment) return

    // Remove from UI immediately (optimistic delete)
    const updatedComments = safeComments.filter(c => c.id !== commentId)
    onCommentsChange(updatedComments)

    // If temporary comment or in creation mode, just remove from UI
    if (comment.isTemporary || isTaskCreation) {
      return
    }

    try {
      // Delete from database
      const success = await deleteComment(commentId)
      if (!success) {
        // Restore comment if delete failed
        onCommentsChange([comment, ...updatedComments])
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      // Restore comment on error
      onCommentsChange([comment, ...updatedComments])
    }
  }

  const startEditingComment = (commentId: string, currentText: string) => {
    setEditingComment({ commentId, text: currentText })
  }

  const saveEditedComment = async (commentId: string) => {
    if (!editingComment || editingComment.text.trim() === "") return

    const originalComment = safeComments.find(c => c.id === commentId)
    if (!originalComment) return

    // Update UI immediately (optimistic update)
    const editedComment = { 
      ...originalComment, 
      content: editingComment.text.trim(), 
      editedAt: new Date(),
      uploadStatus: 'uploading' as const
    }
    const updatedComments = safeComments.map(c => 
      c.id === commentId ? editedComment : c
    )
    onCommentsChange(updatedComments)
    setEditingComment(null)

    // If in creation mode, just update local state
    if (isTaskCreation) {
      const finalComment = { ...editedComment, uploadStatus: 'success' as const }
      const finalComments = safeComments.map(c => 
        c.id === commentId ? finalComment : c
      )
      onCommentsChange(finalComments)
      return
    }

    try {
      // Save to database
      const dbComment = await updateComment(commentId, { 
        content: editingComment.text.trim(),
        edited_by: user?.id 
      })
      
      if (dbComment) {
        const successComment = { ...editedComment, uploadStatus: 'success' as const }
        const finalComments = safeComments.map(c => 
          c.id === commentId ? successComment : c
        )
        onCommentsChange(finalComments)
      } else {
        throw new Error('Failed to update comment')
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      // Revert to original on error
      onCommentsChange(safeComments.map(c => 
        c.id === commentId ? { ...originalComment, uploadStatus: 'failed' as const } : c
      ))
    }
  }

  const cancelEditingComment = () => {
    setEditingComment(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      addCommentHandler()
    }
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

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {safeComments
          .filter(comment => comment.content !== undefined)
          .map((comment) => (
          <Card key={comment.id} className={cn(
            "border-border/50",
            comment.uploadStatus === 'failed' && "border-red-200 bg-red-50"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {comment.author.initials}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {comment.author.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                    </span>
                    {comment.editedAt && (
                      <span className="text-xs text-muted-foreground">(edited)</span>
                    )}
                    <div className="flex items-center gap-1">
                      {getUploadStatusIcon(comment.uploadStatus)}
                      {comment.uploadStatus === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryComment(comment.id)}
                          className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                          title="Retry upload"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {editingComment?.commentId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingComment.text}
                        onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                        className="text-sm min-h-[60px] resize-none"
                        placeholder="Edit your comment..."
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveEditedComment(comment.id)}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditingComment}
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm text-foreground break-words whitespace-pre-wrap overflow-hidden leading-relaxed">
                        {comment.content || "No content"}
                      </p>
                      {comment.content && comment.content.length > 100 && (
                        <p className="text-xs text-muted-foreground">
                          {comment.content.length} characters
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-1 flex-shrink-0">
                  {!editingComment && comment.uploadStatus !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditingComment(comment.id, comment.content || "")}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-600"
                      title="Edit comment"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                  )}
                  {comment.uploadStatus !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCommentHandler(comment.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Textarea
            placeholder={placeholder}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[80px] resize-none"
            disabled={!user}
          />
        </div>
        <Button
          onClick={addCommentHandler}
          disabled={!newComment.trim() || !user}
          className="self-end h-10 px-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      
      {!user && (
        <p className="text-xs text-muted-foreground">
          Please log in to add comments.
        </p>
      )}
    </div>
  )
}
