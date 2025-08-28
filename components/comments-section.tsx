"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Comment {
  id: string
  author: {
    name: string
    initials: string
  }
  content: string
  timestamp: Date
  editedAt?: Date
}

interface CommentsSectionProps {
  comments: Comment[]
  onCommentsChange: (comments: Comment[]) => void
  placeholder?: string
}

export function CommentsSection({
  comments,
  onCommentsChange,
  placeholder = "Add a comment...",
}: CommentsSectionProps) {
  const safeComments = Array.isArray(comments) ? comments : []

  const [newComment, setNewComment] = useState("")
  const [editingComment, setEditingComment] = useState<{ commentId: string; text: string } | null>(null)

  const addComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        author: {
          name: "Current User", // This would come from auth context
          initials: "CU",
        },
        content: newComment.trim(),
        timestamp: new Date(),
      }
      onCommentsChange([...safeComments, comment])
      setNewComment("")
    }
  }

  const deleteComment = (commentId: string) => {
    const updatedComments = safeComments.filter((comment) => comment.id !== commentId)
    onCommentsChange(updatedComments)
  }

  const startEditingComment = (commentId: string, currentText: string) => {
    setEditingComment({ commentId, text: currentText })
  }

  const saveEditedComment = (commentId: string) => {
    if (!editingComment || editingComment.text.trim() === "") return

    const updatedComments = safeComments.map((comment) =>
      comment.id === commentId
        ? { ...comment, content: editingComment.text.trim(), editedAt: new Date() }
        : comment
    )
    onCommentsChange(updatedComments)
    setEditingComment(null)
  }

  const cancelEditingComment = () => {
    setEditingComment(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      addComment()
    }
  }

  return (
    <div className="space-y-3">
      {/* Comments List */}
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {safeComments
          .filter(comment => comment && comment.id && comment.author && comment.content !== undefined)
          .map((comment) => (
          <Card key={comment.id} className="border-border/50">
            <CardContent className="p-3">
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                    {comment.author?.initials || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {comment.author?.name || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {comment.timestamp ? formatDistanceToNow(comment.timestamp, { addSuffix: true }) : "Unknown time"}
                      {comment.editedAt && (
                        <span className="ml-1 text-xs text-muted-foreground/70">(edited)</span>
                      )}
                    </span>
                  </div>
                  
                  {editingComment?.commentId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingComment.text}
                        onChange={(e) => setEditingComment(prev => prev ? { ...prev, text: e.target.value } : null)}
                        className="text-sm min-h-[60px] resize-none"
                        placeholder="Edit your comment..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault()
                            saveEditedComment(comment.id)
                          } else if (e.key === "Escape") {
                            e.preventDefault()
                            cancelEditingComment()
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEditedComment(comment.id)}
                          className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditingComment}
                          className="h-7 px-2 text-xs"
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
                  {!editingComment && (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteComment(comment.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {safeComments.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">No comments yet. Be the first to comment!</p>
        </div>
      )}

      {/* Add Comment */}
      <div className="flex gap-2">
        <Textarea
          id="new-comment"
          name="new-comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={placeholder}
          onKeyDown={handleKeyPress}
          rows={2}
          className="resize-none"
        />
        <Button type="button" onClick={addComment} disabled={!newComment.trim()} size="sm" className="self-end">
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Press Ctrl+Enter to send</p>
    </div>
  )
}
