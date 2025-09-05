"use client"

import { useState, useEffect } from "react"
// import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )

export function SimpleLandingPage() {
  const [activeTab, setActiveTab] = useState("signin")
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [message, setMessage] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(false) // Temporarily disabled

  // Check if user is already authenticated
  useEffect(() => {
    // Temporarily disabled for testing
    // checkAuthStatus()
    setCheckingAuth(false)
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Temporarily disabled
      // const { data: { user } } = await supabase.auth.getUser()
      // if (user) {
      //   // User is authenticated, redirect to Kanban dashboard
      //   window.location.href = "/kanban"
      // }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setCheckingAuth(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setShowError(false)
    setShowSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string

    try {
      // Temporarily disabled for testing
      // const { data, error } = await supabase.auth.signUp({
      //   email,
      //   password,
      //   options: {
      //     data: {
      //       full_name: fullName
      //     }
      //   }
      // })

      // if (error) {
      //   setShowError(true)
      //   setMessage(error.message)
      // } else {
      //   setShowSuccess(true)
      //   setMessage("Account created successfully! Please check your email to confirm your account.")
      // }
      
      // For now, just show a success message
      setShowSuccess(true)
      setMessage("Account creation coming soon! Supabase integration will be enabled shortly.")
    } catch (error) {
      setShowError(true)
      setMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setShowError(false)
    setShowSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      // Temporarily disabled for testing
      // const { data, error } = await supabase.auth.signInWithPassword({
      //   email,
      //   password
      // })

      // if (error) {
      //   setShowError(true)
      //   setMessage(error.message)
      // } else {
      //   setShowSuccess(true)
      //   setMessage("Sign in successful! Redirecting to Kanban dashboard...")
      //   // Redirect to Kanban dashboard after successful sign in
      //   setTimeout(() => {
      //     window.location.href = "/kanban"
      //   }, 1500)
      //   return
      // }
      
      // For now, just show a message
      setShowSuccess(true)
      setMessage("Authentication coming soon! Supabase integration will be enabled shortly.")
    } catch (error) {
      setShowError(true)
      setMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setShowError(false)
    setShowSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    try {
      // Temporarily disabled for testing
      // const { error } = await supabase.auth.signInWithOtp({
      //   email,
      //   options: {
      //     emailRedirectTo: `${window.location.origin}/auth/callback`
      //   }
      // })

      // if (error) {
      //   setShowError(true)
      //   setMessage(error.message)
      // } else {
      //   setShowSuccess(true)
      //   setMessage("Magic link sent! Please check your email and click the link to sign in.")
      //   return
      // }
      
      // For now, just show a success message
      setShowSuccess(true)
      setMessage("Magic link feature coming soon! Supabase integration will be enabled shortly.")
    } catch (error) {
      setShowError(true)
      setMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      {/* Left Side - Product Introduction */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="max-w-2xl space-y-8">
          {/* Logo and Brand */}
          <div className="text-center lg:text-left space-y-4">
            <div className="flex items-center justify-center lg:justify-start space-x-4">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-3xl font-bold">C</span>
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                  Canopus Works
                </h1>
                <p className="text-lg text-gray-600 font-medium">Task Management System</p>
              </div>
            </div>
          </div>
  
          {/* Product Features */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 text-center lg:text-left">
              Streamline Your Workflow
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-green-600 text-sm font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Kanban Board</h3>
                  <p className="text-sm text-gray-600">Visual task management with drag & drop</p>
                </div>
              </div>
  
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 text-sm font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Team Collaboration</h3>
                  <p className="text-sm text-gray-600">Assign tasks and track progress</p>
                </div>
              </div>
  
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600 text-sm font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Real-time Updates</h3>
                  <p className="text-sm text-gray-600">Instant synchronization across devices</p>
                </div>
              </div>
  
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-orange-600 text-sm font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Smart Analytics</h3>
                  <p className="text-sm text-gray-600">Track productivity and performance</p>
                </div>
              </div>
            </div>
  
            {/* Call to Action */}
            <div className="text-center lg:text-left pt-4">
              <p className="text-lg text-gray-700 mb-4">
                Join thousands of teams already using Canopus Works to boost their productivity
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 bg-blue-500 rounded-full border-2 border-white"></div>
                    <div className="h-8 w-8 bg-green-500 rounded-full border-2 border-white"></div>
                    <div className="h-8 w-8 bg-purple-500 rounded-full border-2 border-white"></div>
                  </div>
                  <span>500+ active users</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="text-yellow-500">★★★★★</span>
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      {/* Right Side - Authentication */}
      <div className="w-full lg:w-96 bg-white shadow-2xl flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Auth Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
              <div className="h-5 w-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">
                ✓
              </div>
              <p className="text-green-800 text-sm">{message}</p>
            </div>
          )}

          {/* Error Message */}
          {showError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <div className="h-5 w-5 bg-red-600 rounded-full flex items-center justify-center text-white text-xs">
                ✗
              </div>
              <p className="text-red-800 text-sm">{message}</p>
            </div>
          )}

          {/* Auth Tabs */}
          <div className="bg-gray-50 rounded-lg p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab("signin")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "signin" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab("signup")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "signup" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setActiveTab("magic")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === "magic" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Magic Link
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Sign In Tab */}
            {activeTab === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signin-email" className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    defaultValue="dineshraveendran26@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signin-password" className="text-sm font-medium text-gray-700">Password</label>
                  <input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    defaultValue="Welcome123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )}

            {/* Sign Up Tab */}
            {activeTab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-fullname" className="text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    id="signup-fullname"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm font-medium text-gray-700">Password</label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                    minLength={6}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}

            {/* Magic Link Tab */}
            {activeTab === "magic" && (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="text-center space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    Enter your email and we'll send you a magic link to sign in instantly
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="magic-email" className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="magic-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending link..." : "Send Magic Link"}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
            <p>Secure authentication powered by Supabase</p>
          </div>
        </div>
      </div>
    </div>
  )
} 