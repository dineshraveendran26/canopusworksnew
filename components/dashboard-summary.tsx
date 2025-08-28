"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, AlertTriangle, Users } from "lucide-react"
import { useTaskContext } from "@/contexts/task-context"
import { TeamMembersModal } from "./team-members-modal"
import { useTeamMembers } from "@/hooks/use-team-members"

export function DashboardSummary() {
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const { tasks, setFilter, setSearchQuery } = useTaskContext()
  const { teamMembers = [] } = useTeamMembers()

  const totalTasks = tasks?.length || 0
  const completedTasks = tasks?.filter((task) => task?.status === "Completed")?.length || 0
  const attentionTasks = tasks?.filter((task) => task?.priority === "Critical")?.length || 0
  const teamMembersCount = teamMembers?.length || 0

  const kpiData = [
    {
      id: "total-tasks",
      title: "Total Tasks",
      value: totalTasks.toString(),
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      id: "completed-tasks",
      title: "Completed Tasks",
      value: completedTasks.toString(),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      id: "attention-tasks",
      title: "Tasks Needing Attention",
      value: attentionTasks.toString(),
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      id: "team-members",
      title: "Team Members",
      value: teamMembersCount.toString(),
      icon: Users,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ]

  const handleCardClick = (cardId: string) => {
    if (cardId === "team-members") {
      setIsTeamModalOpen(true)
    } else if (cardId === "attention-tasks") {
      setFilter({ type: "attention" })
      setSearchQuery("") // Clear any search query
    } else if (cardId === "completed-tasks") {
      setFilter({ type: "completed" })
      setSearchQuery("") // Clear any search query
    } else if (cardId === "total-tasks") {
      // Reset to show all tasks
      setFilter({ type: "all" })
      setSearchQuery("") // Clear any search query
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiData.map((kpi) => (
          <Card
            key={kpi.id}
            className="cursor-pointer hover:shadow-md transition-all duration-200 border-[--border] hover:scale-[1.02]"
            onClick={() => handleCardClick(kpi.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`h-12 w-12 rounded-lg flex items-center justify-center ${kpi.bgColor}`}
                >
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TeamMembersModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
      />
    </div>
  )
}
