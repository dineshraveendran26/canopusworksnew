"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskModal } from "@/components/task-modal"
import { useTaskContext } from "@/contexts/task-context"

export function AddTaskButton() {
  console.log('🔄 AddTaskButton rendered')
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  
  // Test if we can access the context
  try {
    const context = useTaskContext()
    console.log('🔄 AddTaskButton - useTaskContext result:', {
      hasAddTask: !!context?.addTask,
      hasUpdateTask: !!context?.updateTask,
      hasDeleteTask: !!context?.deleteTask,
      tasksCount: context?.tasks?.length || 0
    })
  } catch (error) {
    console.error('❌ AddTaskButton - useTaskContext error:', error)
  }

  return (
    <>
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
          onClick={() => {
            console.log('🔄 AddTaskButton clicked - opening modal')
            setIsTaskModalOpen(true)
          }}
        >
          <Plus className="w-6 h-6" />
          <span className="sr-only">Add Task</span>
        </Button>
      </div>

      <TaskModal open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen} mode="create" />
    </>
  )
}
