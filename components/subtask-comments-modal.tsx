"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CommentsSection } from "@/components/comments-section"

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
  uploadStatus?: 'uploading' | 'success' | 'failed'
  isTemporary?: boolean
}

interface SubtaskCommentsModalProps {
  isOpen: boolean
  onClose: () => void
  subtaskId: string
  subtaskTitle: string
  taskId: string
  comments: UIComment[]
  onCommentsChange: (comments: UIComment[]) => void
  isTaskCreation?: boolean
}

export function SubtaskCommentsModal({
  isOpen,
  onClose,
  subtaskId,
  subtaskTitle,
  taskId,
  comments,
  onCommentsChange,
  isTaskCreation = false
}: SubtaskCommentsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">Comments: {subtaskTitle}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 p-6">
          <CommentsSection
            comments={comments}
            onCommentsChange={onCommentsChange}
            taskId={taskId}
            subtaskId={subtaskId}
            isTaskCreation={isTaskCreation}
            placeholder="Add a comment to this subtask..."
          />
        </div>
      </DialogContent>
    </Dialog>
  )
} 