"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { EnhancedSignupForm } from "@/components/enhanced-signup-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Users, BarChart3, MessageSquare, Clock, Shield, Smartphone } from "lucide-react"

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

  // Monitor user state and redirect when authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log('🔄 HomePage - User authenticated, redirecting to Kanban dashboard...')
      router.push("/kanban")
      
      // Fallback: Force redirect after a short delay if router.push doesn't work
      const fallbackTimeout = setTimeout(() => {
        console.log('🔄 HomePage - Fallback redirect triggered')
        window.location.href = "/kanban"
      }, 2000) // 2 second fallback
      
      return () => clearTimeout(fallbackTimeout)
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
        setIsLoading(false) // Reset loading on error
      } else {
        console.log('🔄 HomePage - Login successful, waiting for authentication state update...')
        setMessage("Login successful! Please wait while we authenticate you...")
        // Don't reset loading here - let the auth context handle it
        // The redirect will happen automatically via useEffect
      }
    } catch (error) {
      console.error('❌ HomePage - Unexpected login error:', error)
      setMessage("An unexpected error occurred. Please try again.")
      setIsLoading(false) // Reset loading on error
    }
  }

  // Add timeout protection to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ HomePage - Login timeout, resetting loading state')
        setIsLoading(false)
        setMessage("Login timeout. Please try again.")
      }, 15000) // 15 second timeout
      
      return () => clearTimeout(timeout)
    }
  }, [isLoading])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                  Canopus Works
                </h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Section */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Left Content - Hero + Problem Statement */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero Content */}
              <div className="space-y-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  Bring Order to{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Manufacturing Chaos
                  </span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Canopus Works is a modern Kanban-based task management system designed for manufacturing teams. 
                  From the shop floor to the boardroom, track, assign, and complete tasks with clarity and speed.
                </p>
              </div>

              {/* Problem Statement */}
              <div className="bg-white/80 rounded-xl p-6 shadow-md">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Manufacturing teams still run on spreadsheets, whiteboards, and scattered communication.
                </h2>
                <p className="text-base text-gray-600 leading-relaxed">
                  Missed deadlines, unclear ownership, and communication gaps slow down operations. Canopus Works brings 
                  everything into one place — tasks, subtasks, dependencies, and real-time updates — so your teams can 
                  focus on production, not firefighting.
                </p>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {isResetPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isResetPassword 
                      ? "Enter your email to receive a password reset link"
                      : isSignUp 
                        ? "Sign up to get started" 
                        : "Sign in to access your dashboard"
                    }
                  </p>
                </div>

                {isSignUp ? (
                  <EnhancedSignupForm />
                ) : (
                  <form onSubmit={
                    isResetPassword 
                      ? handleResetPassword 
                      : handleLogin
                  } className="space-y-4">
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
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    {/* Password Field (Login Only) */}
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
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                          placeholder="Enter your password"
                          required
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>
                            {isResetPassword 
                              ? "Sending Reset Email..." 
                              : "Signing In..."
                            }
                          </span>
                        </div>
                      ) : (
                        isResetPassword 
                          ? "Send Reset Email" 
                          : "Sign In"
                      )}
                    </button>
                  </form>
                )}

                {/* Toggle Between Login/Signup/Reset */}
                <div className="mt-4 text-center space-y-2">
                  {!isResetPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp)
                        setMessage("")
                        setFullName("")
                      }}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors block w-full"
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
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors block w-full"
                    >
                      Forgot your password?
                    </button>
                  )}
                  
                  {isResetPassword && (
                    <button
                      type="button"
                      onClick={resetForms}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors block w-full"
                    >
                      Back to Sign In
                    </button>
                  )}
                </div>

                {/* Message Display */}
                {message && (
                  <div className={`mt-4 p-3 rounded-lg text-xs ${
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
        </div>
      </section>

      {/* Core Features */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              Core Features
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to manage manufacturing tasks efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-5 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Visual Kanban Board</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Track tasks across "To Do, In Progress, Completed" with drag-and-drop simplicity.
                </p>
              </CardContent>
            </Card>

            <Card className="p-5 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Hierarchy-Aware Permissions</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Mirror your real org structure — managers, supervisors, and teams get the right level of access.
                </p>
              </CardContent>
            </Card>

            <Card className="p-5 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Subtasks & Dependencies</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Break down big jobs into smaller tasks, assign to different team members, and ensure work flows in the right order.
                </p>
              </CardContent>
            </Card>

            <Card className="p-5 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Comments & Collaboration</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Keep all discussions inside the task card. No more lost WhatsApp messages.
                </p>
              </CardContent>
            </Card>

            <Card className="p-5 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Real-Time Updates</h3>
                </div>
                <p className="text-sm text-gray-600">
                  See progress instantly with Supabase-powered live updates.
                </p>
              </CardContent>
            </Card>

            <Card className="p-5 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Audit Trail & Reporting</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Track who did what, when. Generate reports to monitor productivity, bottlenecks, and delays.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-white/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              Why Manufacturing Teams Choose Canopus Works
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-base text-gray-700">Eliminate spreadsheet headaches</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-base text-gray-700">Faster task assignment and tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-base text-gray-700">Clear visibility across teams and shifts</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-base text-gray-700">Reduce delays and bottlenecks</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-base text-gray-700">Mobile-friendly for shop floor use</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-base text-gray-700">Real-time collaboration and updates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reporting Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            From Data to Decisions
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Managers get clear dashboards with actionable insights
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <CardContent className="p-0">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">Task Completion Rates</h3>
                <p className="text-xs text-gray-600">Track productivity metrics</p>
              </CardContent>
            </Card>

            <Card className="p-4 text-center">
              <CardContent className="p-0">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">Team Workload Distribution</h3>
                <p className="text-xs text-gray-600">Balance team capacity</p>
              </CardContent>
            </Card>

            <Card className="p-4 text-center">
              <CardContent className="p-0">
                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">Delayed vs On-Time Tasks</h3>
                <p className="text-xs text-gray-600">Identify bottlenecks</p>
              </CardContent>
            </Card>

            <Card className="p-4 text-center">
              <CardContent className="p-0">
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">Batch & Machine Tracking</h3>
                <p className="text-xs text-gray-600">Monitor production flow</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">C</span>
                </div>
                <h3 className="text-lg font-bold">Canopus Works</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Modern task management for manufacturing teams.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-6 text-center text-gray-400 text-sm">
            <p>&copy; 2024 Canopus Works. All rights reserved.</p>
          </div>
        </div>
      </footer>
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
