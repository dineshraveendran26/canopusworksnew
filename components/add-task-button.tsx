"use client"

import { useState, memo } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskModal } from "@/components/task-modal"
import { useTaskContext } from "@/contexts/task-context"
import { useAuth } from "@/contexts/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

function AddTaskButtonComponent() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  
  // Get context for task operations
  const context = useTaskContext()
  const { user } = useAuth()

  // Check if user has permission to create tasks
  const canCreateTasks = user?.role === 'administrator' || user?.role === 'manager'

  const handleOpenModal = () => {
    setIsOpening(true)
    // Small delay to show loading state
    setTimeout(() => {
      setIsTaskModalOpen(true)
      setIsOpening(false)
    }, 100)
  }

  if (!canCreateTasks) {
    return null // Don't render the button for viewers
  }

  return (
    <>
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
          onClick={handleOpenModal}
          disabled={isOpening}
        >
          {isOpening ? (
            <LoadingSpinner size="sm" color="white" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
          <span className="sr-only">Add Task</span>
        </Button>
      </div>

      <TaskModal open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen} mode="create" />
    </>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const AddTaskButton = memo(AddTaskButtonComponent)
