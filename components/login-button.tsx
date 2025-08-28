"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { LogOut, User } from "lucide-react"

export function LoginButton() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <Button disabled variant="outline" size="sm">
        Loading...
      </Button>
    )
  }

  if (user) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            {user.full_name?.charAt(0)?.toUpperCase() || (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
          </div>
          <div className="hidden sm:block text-sm">
            <div className="font-medium">{user.full_name || user.email.split('@')[0]}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <Button onClick={signOut} variant="outline" size="sm">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    )
  }

  // This shouldn't render when not authenticated since AuthGuard handles the landing page
  return null
} 