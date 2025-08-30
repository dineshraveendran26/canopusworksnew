"use client"

import { useState, memo } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskModal } from "@/components/task-modal"
import { useTaskContext } from "@/contexts/task-context"

function AddTaskButtonComponent() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  
  // Get context for task operations
  const context = useTaskContext()

  return (
    <>
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
          onClick={() => setIsTaskModalOpen(true)}
        >
          <Plus className="w-6 h-6" />
          <span className="sr-only">Add Task</span>
        </Button>
      </div>

      <TaskModal open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen} mode="create" />
    </>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const AddTaskButton = memo(AddTaskButtonComponent)
