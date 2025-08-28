"use client"

import { useEffect, useState, Suspense } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

function DashboardContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Automatically redirect to Kanban dashboard
        setRedirecting(true)
        setTimeout(() => {
          router.push("/kanban")
        }, 1000)
      } else {
        // No user, redirect to login
        router.push("/")
      }
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    // This will be handled by the auth context
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">→</span>
          </div>
          <h2 className="text-2xl font-bold text-blue-600">Redirecting to Kanban Dashboard</h2>
          <p className="text-muted-foreground">Taking you to your task management board...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg shadow-lg p-8">
            <div className="text-center space-y-6">
              <div className="h-20 w-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mx-auto">
                <span className="text-white text-4xl">🎉</span>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-card-foreground mb-2">
                  Welcome to Your Dashboard!
                </h1>
                <p className="text-muted-foreground text-lg">
                  Authentication is working perfectly!
                </p>
              </div>

              <div className="bg-muted rounded-lg p-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-card-foreground mb-3">Your Account Details:</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-blue-600 ml-2">{user?.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="text-blue-600 ml-2">{user?.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-blue-600 ml-2">{user?.full_name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push("/kanban")}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Access Kanban Board
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
} 