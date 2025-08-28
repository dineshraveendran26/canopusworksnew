"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { MessageCircle, AlertTriangle, Calendar, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { TaskModal } from "./task-modal"
import { SubtaskList } from "./subtask-list"
import { useTeamMembers } from "@/hooks/use-team-members"

interface Task {
  id: string
  title: string
  description?: string
  priority: "Low" | "Medium" | "High" | "Critical"
  status: "Todo" | "In Progress" | "Completed"
  startDate?: string
  dueDate?: string
  assignees: string[]
  subtasks: any[]
  comments: any[]
}

interface TaskCardProps {
  task: Task
}

const priorityColors = {
  Low: "bg-green-100 text-green-800 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Critical: "bg-red-100 text-red-800 border-red-200",
}

export function TaskCard({ task }: TaskCardProps) {
  const { teamMembers, loading: teamMembersLoading } = useTeamMembers()
  const completedSubtasks = task.subtasks.filter((st) => st.completed).length
  const totalSubtasks = task.subtasks.length
  const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showSubtasks, setShowSubtasks] = useState(false)

  const currentSubtask =
    completedSubtasks < totalSubtasks ? `Subtask ${completedSubtasks + 1}` : "All subtasks completed"

  // Get all assignees for this task using dynamic team member data
  const assignees = task.assignees.length > 0 && teamMembers.length > 0
    ? teamMembers.filter((member) => task.assignees.includes(member.id))
    : []

  const handleDoubleClick = () => {
    setIsEditModalOpen(true)
  }

  const toggleSubtasks = () => {
    setShowSubtasks(!showSubtasks)
  }

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 border-[--border]"
        onDoubleClick={handleDoubleClick}
      >
        <CardContent className="p-4 space-y-3">
          {/* Title and Priority */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm text-foreground leading-tight">{task.title}</h3>
            <div className="flex items-center gap-1">
              {task.priority === "Critical" && <AlertTriangle className="w-4 h-4 text-red-600" />}
              <Badge variant="outline" className={`text-xs px-2 py-0.5 ${priorityColors[task.priority]}`}>
                {task.priority}
              </Badge>
            </div>
          </div>

          {/* Dates */}
          {(task.startDate || task.dueDate) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.startDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(task.startDate).toLocaleDateString()}</span>
                </div>
              )}
              {task.startDate && task.dueDate && <span>→</span>}
              {task.dueDate && <span className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>}
            </div>
          )}

          {/* Subtasks Section */}
          {totalSubtasks > 0 && (
            <div className="space-y-2">
              <button
                onClick={toggleSubtasks}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSubtasks ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="font-medium">
                  {completedSubtasks}/{totalSubtasks} subtasks completed
                </span>
              </button>
              
              {showSubtasks && (
                <div className="pl-4 space-y-1">
                  {task.subtasks.slice(0, 3).map((subtask, index) => (
                    <div key={subtask.id || index} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${subtask.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                  {task.subtasks.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{task.subtasks.length - 3} more subtasks
                    </div>
                  )}
                </div>
              )}
              
              {/* Progress Bar */}
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {/* Assignees and Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {assignees.length > 0 ? (
                assignees.slice(0, 3).map((assignee, index) => (
                  <Avatar key={assignee.id} className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                      {assignee.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))
              ) : (
                <div className="w-6 h-6" />
              )}
              {assignees.length > 3 && (
                <div className="text-xs text-muted-foreground ml-1">
                  +{assignees.length - 3}
                </div>
              )}
            </div>

            {totalSubtasks > 0 && (
              <div className="text-xs text-muted-foreground">
                {completedSubtasks}/{totalSubtasks}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Task Modal */}
      <TaskModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        mode="edit"
        task={task}
      />
    </>
  )
}
