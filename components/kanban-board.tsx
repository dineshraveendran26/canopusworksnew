"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { TaskCard } from "@/components/task-card"
import { useTaskContext } from "@/contexts/task-context"
import { TaskModal } from "@/components/task-modal"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

export function KanbanBoard() {
  const { getTasksByStatus, filter, getFilteredTasks, setFilter, searchQuery, setSearchQuery, tasks, updateTask, fetchTasks } = useTaskContext()

  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({
    todo: false,
    inProgress: false,
    completed: false,
  })

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [draggingTaskStatus, setDraggingTaskStatus] = useState<string | null>(null)

  // Map column IDs to database status values
  const getStatusFromColumnId = (columnId: string) => {
    switch (columnId) {
      case "todo": return "Todo"
      case "inProgress": return "In Progress"
      case "completed": return "Completed"
      default: return columnId
    }
  }

  const getColumnTasks = (status: string) => {

    // Always apply search filtering if there's a search query
    if (searchQuery.trim()) {
      const filteredTasks = getFilteredTasks()
      return filteredTasks.filter((task) => {
        const taskStatus = getStatusFromColumnId(status)
        return task.status === taskStatus
      })
    }
    
    // Apply other filters if no search query
    if (filter.type !== "all") {
      const filteredTasks = getFilteredTasks()
      return filteredTasks.filter((task) => {
        const taskStatus = getStatusFromColumnId(status)
        return task.status === taskStatus
      })
    }
    
    // No search or filter - return all tasks for this status using getTasksByStatus
    const taskStatus = getStatusFromColumnId(status)
    return getTasksByStatus(taskStatus)
  }

  const columns = [
    { id: "todo", title: "To Do", tasks: getColumnTasks("todo") },
    { id: "inProgress", title: "In Progress", tasks: getColumnTasks("inProgress") },
    { id: "completed", title: "Completed", tasks: getColumnTasks("completed") },
  ]

  const toggleColumn = (columnId: string) => {
    setExpandedColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }))
  }

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }))
  }

  const handleDragStart = (e: React.DragEvent, taskId: string, taskStatus: string) => {
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.setData('taskStatus', taskStatus)
    setDraggingTaskId(taskId)
    setDraggingTaskStatus(taskStatus)
  }

  const handleDragOver = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const draggedTaskStatus = e.dataTransfer.getData('taskStatus')
    
    // Only allow drag over if it's the same column
    if (draggedTaskStatus === targetStatus) {
      e.dataTransfer.dropEffect = 'move'
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const draggedTaskStatus = e.dataTransfer.getData('taskStatus')
    
    // Only allow drops within the same column
    if (taskId && draggedTaskStatus === targetStatus) {
      try {
        setUpdatingTaskId(taskId)
        
        // Get the current tasks in this column
        const currentTasks = getColumnTasks(targetStatus)
        const draggedTaskIndex = currentTasks.findIndex(task => task.id === taskId)
        
        // Calculate the new position based on drop location
        const dropY = e.clientY
        const columnElement = e.currentTarget as HTMLElement
        const columnRect = columnElement.getBoundingClientRect()
        const relativeY = dropY - columnRect.top
        
        // Find the task at the drop position
        let newIndex = 0
        for (let i = 0; i < currentTasks.length; i++) {
          const taskElement = columnElement.querySelector(`[data-task-id="${currentTasks[i].id}"]`) as HTMLElement
          if (taskElement) {
            const taskRect = taskElement.getBoundingClientRect()
            const taskCenter = taskRect.top + taskRect.height / 2
            
            if (relativeY < taskCenter) {
              newIndex = i
              break
            }
            newIndex = i + 1
          }
        }
        
        // Ensure newIndex is within bounds
        newIndex = Math.max(0, Math.min(newIndex, currentTasks.length))
        
        // If the task is being moved to the same position, don't do anything
        if (draggedTaskIndex === newIndex) {
          setUpdatingTaskId(null)
          setDraggingTaskId(null)
          setDraggingTaskStatus(null)
          return
        }
        
        // Simple approach: update the task's updated_at timestamp with a position-based offset
        // This will make it appear in the new position when sorted by updated_at
        const now = new Date()
        const positionOffset = (currentTasks.length - newIndex) * 1000 // 1 second per position
        now.setMilliseconds(now.getMilliseconds() + positionOffset)
        
        await updateTask(taskId, { updated_at: now.toISOString() })
        
        // Refresh the tasks to show the new order
        await fetchTasks()
        
      } catch (error) {
        console.error('Error updating task order:', error)
      } finally {
        setUpdatingTaskId(null)
        setDraggingTaskId(null)
        setDraggingTaskStatus(null)
      }
    } else {
      // Reset drag state if drop is not allowed
      setDraggingTaskId(null)
      setDraggingTaskStatus(null)
    }
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    setDraggingTaskStatus(null)
  }

  return (
    <div className="space-y-4">
      {(filter.type !== "all" || searchQuery.trim()) && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">
            {searchQuery.trim() && <>Searching for: "{searchQuery}"</>}
            {searchQuery.trim() && filter.type !== "all" && <> • </>}
            {filter.type !== "all" && (
              <>Filtered by: {filter.type === "completed" ? "Completed Tasks" : "Tasks Needing Attention"}</>
            )}
          </span>
          <button
            onClick={() => {
              setFilter({ type: "all" })
              setSearchQuery("")
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear{" "}
            {searchQuery.trim() && filter.type !== "all" ? "all filters" : searchQuery.trim() ? "search" : "filter"}
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3 p-4 bg-card border rounded-lg shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setShowTaskModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Drag & Drop Info */}
      {/* Task Modal */}
      <TaskModal 
        open={showTaskModal} 
        onOpenChange={setShowTaskModal} 
        mode="create" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {columns.map((column) => (
          <Card 
            key={column.id} 
            className={cn(
              "border-[--border] transition-all duration-200",
              updatingTaskId && draggingTaskId && draggingTaskStatus === getStatusFromColumnId(column.id) && "bg-blue-50 dark:bg-blue-950/20",
              draggingTaskId && draggingTaskStatus !== getStatusFromColumnId(column.id) && "opacity-50"
            )}
            onDragOver={(e) => handleDragOver(e, getStatusFromColumnId(column.id))}
            onDrop={(e) => handleDrop(e, getStatusFromColumnId(column.id))}
            onDragEnd={handleDragEnd}
          >
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  {column.title}
                  <Badge variant="secondary" className="text-xs">
                    {column.tasks.length}
                  </Badge>
                </CardTitle>
                <button
                  onClick={() => toggleColumn(column.id)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {expandedColumns[column.id] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 sm:space-y-3">
                                {column.tasks.map((task, index) => (
                  <div key={`${column.id}-${task.id}-${index}`} className="transition-all duration-200 ease-in-out">
                    {expandedColumns[column.id] ? (
                      expandedTasks[task.id] ? (
                        <div className="space-y-2">
                        <div key={task.id} data-task-id={task.id}>
                          <TaskCard 
                            task={task} 
                            onDragStart={(e) => handleDragStart(e, task.id, getStatusFromColumnId(column.id))}
                            isUpdating={updatingTaskId === task.id}
                          />
                        </div>
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="w-full p-1 hover:bg-muted rounded transition-colors flex items-center justify-center"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div key={task.id} data-task-id={task.id}>
                          <TaskCard 
                            task={task} 
                            onDragStart={(e) => handleDragStart(e, task.id, getStatusFromColumnId(column.id))}
                            isUpdating={updatingTaskId === task.id}
                          />
                        </div>
                      )
                    ) : expandedTasks[task.id] ? (
                      <div className="space-y-2">
                        <TaskCard 
                          task={task} 
                          onDragStart={(e) => handleDragStart(e, task.id, getStatusFromColumnId(column.id))}
                          isUpdating={updatingTaskId === task.id}
                        />
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="w-full p-1 hover:bg-muted rounded transition-colors flex items-center justify-center"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        key={task.id} 
                        data-task-id={task.id}
                        className={cn(
                          "p-2 sm:p-2.5 bg-muted/50 rounded-md border-[--border] hover:bg-muted/70 transition-colors relative cursor-move",
                          updatingTaskId === task.id && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task.id, getStatusFromColumnId(column.id))}
                      >
                        {updatingTaskId === task.id && (
                          <div className="absolute inset-0 bg-blue-100/50 dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-medium text-foreground truncate flex-1 min-w-0">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={
                                task.priority === "Critical"
                                  ? "destructive"
                                  : task.priority === "High"
                                    ? "default"
                                    : task.priority === "Medium"
                                      ? "secondary"
                                      : "outline"
                              }
                              className="text-xs px-1.5 py-0.5 h-auto"
                            >
                              {task.priority}
                            </Badge>
                            <button
                              onClick={() => toggleTask(task.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
