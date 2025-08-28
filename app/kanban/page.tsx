"use client"

import { KanbanBoard } from "@/components/kanban-board"
import { DashboardSummary } from "@/components/dashboard-summary"
import { AddTaskButton } from "@/components/add-task-button"
import { TaskModal } from "@/components/task-modal"
import { TaskProvider } from "@/contexts/task-context"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, Suspense } from "react"

function KanbanDashboardContent() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Summary */}
        <DashboardSummary />

        {/* Kanban Board */}
        <div className="mt-8">
          <KanbanBoard />
        </div>

        {/* Floating Add Task Button */}
        <div className="fixed bottom-8 right-8">
          <AddTaskButton />
        </div>
      </main>
    </div>
  )
}

export default function KanbanPage() {
  return (
    <TaskProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }>
        <KanbanDashboardContent />
      </Suspense>
    </TaskProvider>
  )
} 