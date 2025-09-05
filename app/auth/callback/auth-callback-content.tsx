"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export function AuthCallbackContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    if (error) {
      setStatus("error")
      setMessage(errorDescription || "Authentication failed")
    } else {
      setStatus("success")
      setMessage("Authentication successful! Redirecting to Kanban dashboard...")
      // Redirect to Kanban dashboard after successful authentication
      setTimeout(() => {
        window.location.href = "/kanban"
      }, 2000)
    }
  }, [searchParams])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Processing authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto ${
          status === "success" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        }`}>
          {status === "success" ? (
            <span className="text-2xl">✓</span>
          ) : (
            <span className="text-2xl">✗</span>
          )}
        </div>
        <h2 className={`text-2xl font-bold ${
          status === "success" ? "text-green-600" : "text-red-600"
        }`}>
          {status === "success" ? "Success!" : "Error"}
        </h2>
        <p className="text-muted-foreground">{message}</p>
        {status === "error" && (
          <Link
            href="/"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return Home
          </Link>
        )}
      </div>
    </div>
  )
} 