"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

function HomePageContent() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResetPassword, setIsResetPassword] = useState(false)
  const [email, setEmail] = useState("dineshraveendran26@gmail.com")
  const [password, setPassword] = useState("Welcome123")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const { signIn, signUp, resetPassword, user, loading } = useAuth()
  const router = useRouter()

  // Debug: Log current auth state
  useEffect(() => {
    console.log('🔄 HomePage - Current auth state:', { user, loading })
  }, [user, loading])

  // Debug: Check if there's an existing session on page load
  useEffect(() => {
    console.log('🔄 HomePage - Page loaded, checking for existing session...')
    // Session check is now handled by the auth context, so we don't need to check here
    console.log('🔄 HomePage - Auth context will handle session management')
  }, [])

  // Monitor user state and redirect when authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log('🔄 HomePage - User authenticated, redirecting to Kanban dashboard...')
      router.push("/kanban")
    }
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      console.log('🔄 HomePage - Starting login process...')
      const { error } = await signIn(email, password)
      
      if (error) {
        console.error('❌ HomePage - Login error:', error)
        setMessage(error)
      } else {
        console.log('🔄 HomePage - Login successful, waiting for authentication state update...')
        setMessage("Login successful! Please wait while we authenticate you...")
        // Redirect will happen automatically via useEffect when user state updates
      }
    } catch (error) {
      console.error('❌ HomePage - Unexpected login error:', error)
      setMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const { error } = await signUp(email, password, fullName)
      
      if (error) {
        setMessage(error)
      } else {
        setMessage("Account created successfully! Please check your email to confirm your account.")
        setIsSignUp(false)
      }
    } catch (error) {
      setMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      const { error } = await resetPassword(email)
      
      if (error) {
        setMessage(error)
      } else {
        setMessage("Password reset email sent! Please check your email and click the reset link.")
        setIsResetPassword(false)
      }
    } catch (error) {
      setMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForms = () => {
    setIsSignUp(false)
    setIsResetPassword(false)
    setMessage("")
    setFullName("")
  }

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-3xl font-bold">C</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Canopus Works
              </h1>
              <p className="text-lg text-gray-600 font-medium">Task Management System</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isResetPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-gray-600">
            {isResetPassword 
              ? "Enter your email to receive a password reset link"
              : isSignUp 
                ? "Sign up to get started" 
                : "Sign in to access your dashboard"
            }
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={
            isResetPassword 
              ? handleResetPassword 
              : isSignUp 
                ? handleSignUp 
                : handleLogin
          } className="space-y-6">
            {/* Full Name Field (Signup Only) */}
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your full name"
                  required={isSignUp}
                />
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Field (Login/Signup Only) */}
            {!isResetPassword && (
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>
                    {isResetPassword 
                      ? "Sending Reset Email..." 
                      : isSignUp 
                        ? "Creating Account..." 
                        : "Signing In..."
                    }
                  </span>
                </div>
              ) : (
                isResetPassword 
                  ? "Send Reset Email" 
                  : isSignUp 
                    ? "Create Account" 
                    : "Sign In"
              )}
            </button>
          </form>

          {/* Toggle Between Login/Signup/Reset */}
          <div className="mt-6 text-center space-y-2">
            {!isResetPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setMessage("")
                  setFullName("")
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors block w-full"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            )}
            
            {!isSignUp && !isResetPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsResetPassword(true)
                  setMessage("")
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors block w-full"
              >
                Forgot your password?
              </button>
            )}
            
            {isResetPassword && (
              <button
                type="button"
                onClick={resetForms}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors block w-full"
              >
                Back to Sign In
              </button>
            )}
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mt-4 p-4 rounded-lg text-sm ${
              message.includes("successful") || message.includes("created") || message.includes("sent")
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
