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
import { Trash2, MessageCircle, Users, CalendarIcon, Send, X, Plus } from "lucide-react"
import { format } from "date-fns"
import { useTeamMembers } from "@/hooks/use-team-members"
import { useSubtaskAssignments } from "@/hooks/use-subtask-assignments"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface SubtaskComment {
  id: string
  text: string
  author: string
  timestamp: Date
  editedAt?: Date
  isEditing?: boolean
}

interface Subtask {
  id: string
  title: string
  completed: boolean
  assignees?: string[]
  comments: SubtaskComment[]
  startDate?: Date
  endDate?: Date
}

interface SubtaskListProps {
  subtasks: Subtask[]
  onSubtasksChange: (subtasks: Subtask[]) => void
  onCommentClick?: (subtaskId: string) => void
  selectedCommentSubtask?: string | null
}

export function SubtaskList({ subtasks, onSubtasksChange, onCommentClick, selectedCommentSubtask }: SubtaskListProps) {
  const safeSubtasks = Array.isArray(subtasks) ? subtasks : []
  const { teamMembers, loading: teamMembersLoading } = useTeamMembers()
  const { 
    getEffectiveSubtaskAssignees, 
    assignUsersToSubtask, 
    loading: assignmentLoading 
  } = useSubtaskAssignments()

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [assigneeDropdown, setAssigneeDropdown] = useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState<{ subtaskId: string; type: "start" | "end" } | null>(null)
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState("")
  const [commentModalOpen, setCommentModalOpen] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState("")
  const [editingComment, setEditingComment] = useState<{ subtaskId: string; commentId: string; text: string } | null>(null)

  const addSubtask = () => {
    if (newSubtaskTitle.trim()) {
      const newSubtask: Subtask = {
        id: Date.now().toString(),
        title: newSubtaskTitle.trim(),
        completed: false,
        assignees: [],
        comments: [],
        startDate: undefined,
        endDate: undefined,
      }
      onSubtasksChange([...safeSubtasks, newSubtask])
      setNewSubtaskTitle("")
    }
  }

  const updateSubtask = (id: string, updates: Partial<Subtask>) => {
    onSubtasksChange(safeSubtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...updates } : subtask)))
  }

  const deleteSubtask = (id: string) => {
    onSubtasksChange(safeSubtasks.filter((subtask) => subtask.id !== id))
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
      
      // Update backend assignments
      try {
        await assignUsersToSubtask(subtaskId, newAssignees)
      } catch (error) {
        console.error('Failed to update subtask assignments:', error)
        // Revert local state on error
        updateSubtask(subtaskId, { assignees: currentAssignees })
      }
    }
  }

  const handleCommentClick = (subtaskId: string) => {
    setCommentModalOpen(subtaskId)
    setNewCommentText("")
  }

  const addComment = (subtaskId: string) => {
    if (newCommentText.trim()) {
      const subtask = safeSubtasks.find((s) => s.id === subtaskId)
      if (subtask) {
        const newComment: SubtaskComment = {
          id: Date.now().toString(),
          text: newCommentText.trim(),
          author: "Dinesh Raveendran", // Mock user for now
          timestamp: new Date(),
        }
        const updatedComments = [...(subtask.comments || []), newComment]
        updateSubtask(subtaskId, { comments: updatedComments })
        setNewCommentText("")
      }
    }
  }

  const deleteComment = (subtaskId: string, commentId: string) => {
    const subtask = safeSubtasks.find((s) => s.id === subtaskId)
    if (subtask) {
      const updatedComments = subtask.comments.filter((c) => c.id !== commentId)
      updateSubtask(subtaskId, { comments: updatedComments })
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

  return (
    <div className="space-y-4">
      {safeSubtasks.length > 0 && (
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-foreground">Subtasks ({safeSubtasks.length})</h3>
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
                  className="flex-shrink-0 border-2 border-gray-400 hover:border-gray-500 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <Input
                  id={`subtask-title-${subtask.id}`}
                  name={`subtask-title-${subtask.id}`}
                  value={subtask.title}
                  onChange={(e) => updateSubtask(subtask.id, { title: e.target.value })}
                  onKeyDown={handleSubtaskTitleKeyDown}
                  className={cn(
                    "flex-1 min-w-0 border-none bg-transparent p-0 focus-visible:ring-0 text-sm",
                    subtask.completed && "line-through text-muted-foreground",
                  )}
                  placeholder={`Subtask ${index + 1}`}
                />
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
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

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Add a new subtask</h3>
        <div className="flex gap-2">
          <Input
            id="new-subtask-title"
            name="new-subtask-title"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder="Add a new subtask"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                e.stopPropagation()
                addSubtask()
              }
            }}
            className="flex-1"
          />
          <Button type="button" onClick={addSubtask} size="sm" className="bg-blue-600 hover:bg-blue-700">
            Add
          </Button>
        </div>
      </div>

      {safeSubtasks.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">No subtasks yet. Add one above to get started.</p>
        </div>
      )}

      {/* Subtask Comments Modal */}
      {commentModalOpen && (
        <Dialog open={!!commentModalOpen} onOpenChange={(open) => !open && setCommentModalOpen(null)}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate">Comments: {safeSubtasks.find(s => s.id === commentModalOpen)?.title}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 flex flex-col min-h-0">
              {/* Comments List */}
              <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/20">
                {(() => {
                  const subtask = safeSubtasks.find(s => s.id === commentModalOpen)
                  const comments = subtask?.comments || []
                  
                  if (comments.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No comments yet. Be the first to comment!</p>
                      </div>
                    )
                  }
                  
                  return comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 bg-background rounded-lg border-[--border] min-w-0">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {comment.author.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{comment.author}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {format(comment.timestamp, "MMM dd, yyyy 'at' h:mm a")}
                            {comment.editedAt && (
                              <span className="ml-1 text-xs text-muted-foreground/70">(edited)</span>
                            )}
                          </span>
                        </div>
                        
                        {editingComment?.commentId === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              id={`edit-comment-${comment.id}`}
                              name={`edit-comment-${comment.id}`}
                              value={editingComment.text}
                              onChange={(e) => setEditingComment(prev => prev ? { ...prev, text: e.target.value } : null)}
                              className="text-sm min-h-[80px] resize-none"
                              placeholder="Edit your comment..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault()
                                  saveEditedComment(commentModalOpen!, comment.id)
                                } else if (e.key === "Escape") {
                                  e.preventDefault()
                                  cancelEditingComment()
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEditedComment(commentModalOpen!, comment.id)}
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
                              {comment.text}
                            </p>
                            {comment.text.length > 100 && (
                              <p className="text-xs text-muted-foreground">
                                {comment.text.length} characters
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
                            onClick={() => startEditingComment(commentModalOpen!, comment.id, comment.text)}
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
                          onClick={() => deleteComment(commentModalOpen!, comment.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete comment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
              
              {/* Add Comment Input */}
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="new-comment-text"
                    name="new-comment-text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => handleCommentKeyDown(e, commentModalOpen!)}
                    placeholder={`Add a comment to "${safeSubtasks.find(s => s.id === commentModalOpen)?.title}"...`}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => addComment(commentModalOpen!)}
                    disabled={!newCommentText.trim()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Press Ctrl+Enter to send
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
