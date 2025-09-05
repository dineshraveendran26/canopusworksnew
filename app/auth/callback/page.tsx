"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function AuthCallbackContent() {
  const [message, setMessage] = useState("Processing...")
  const [isSuccess, setIsSuccess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setIsProcessing(true)
        
        // Get URL parameters
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        // Handle errors from URL
        if (error) {
          console.error('Auth error from URL:', error, errorDescription)
          setMessage(`Authentication error: ${errorDescription || error}`)
          setIsSuccess(false)
          setIsProcessing(false)
          setTimeout(() => router.push("/"), 5000)
          return
        }

        // Handle password reset
        if (accessToken && refreshToken) {
          try {
            // Check if this is a password reset by looking at the token type
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            
            if (sessionError) {
              throw sessionError
            }
            
            if (data.session) {
              // Check if this is a password reset session
              if (data.session.user.app_metadata?.provider === 'email') {
                // Redirect to reset password page
                router.push(`/auth/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`)
                return
              } else {
                setMessage("Authentication successful! Redirecting to dashboard...")
                setIsSuccess(true)
                setIsProcessing(false)
                setTimeout(() => router.push("/kanban"), 2000)
                return
              }
            }
          } catch (resetError) {
            console.error('Password reset error:', resetError)
            setMessage("Password reset failed. Please try again.")
            setIsSuccess(false)
            setIsProcessing(false)
            setTimeout(() => router.push("/"), 5000)
            return
          }
        }

        // Additional check: if we have tokens but they're not handled above, 
        // assume it's a password reset and redirect
        if (accessToken && refreshToken) {
          console.log('Redirecting to reset password page...')
          router.push(`/auth/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`)
          return
        }

        // Handle regular auth callback
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error('Session error:', sessionError)
            setMessage("Authentication error. Please try again.")
            setIsSuccess(false)
            setIsProcessing(false)
            setTimeout(() => router.push("/"), 5000)
            return
          }

          if (session) {
            setMessage("Authentication successful! Redirecting to dashboard...")
            setIsSuccess(true)
            setIsProcessing(false)
            setTimeout(() => router.push("/kanban"), 2000)
          } else {
            setMessage("Authentication failed. Please try again.")
            setIsSuccess(false)
            setIsProcessing(false)
            setTimeout(() => router.push("/"), 5000)
          }
        } catch (error) {
          console.error('Session check error:', error)
          setMessage("Authentication check failed. Please try again.")
          setIsSuccess(false)
          setIsProcessing(false)
          setTimeout(() => router.push("/"), 5000)
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        setMessage("An unexpected error occurred. Please try again.")
        setIsSuccess(false)
        setIsProcessing(false)
        setTimeout(() => router.push("/"), 5000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-3xl font-bold">C</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Canopus Works
              </h1>
              <p className="text-lg text-gray-600 font-medium">Authentication</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="space-y-4">
            {isProcessing ? (
              <div className="text-blue-600">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              </div>
            ) : isSuccess ? (
              <div className="text-green-600">
                <svg className="h-16 w-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ) : (
              <div className="text-red-600">
                <svg className="h-16 w-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            )}
            
            <h2 className="text-xl font-semibold text-gray-800">
              {isProcessing ? "Processing..." : isSuccess ? "Success!" : "Error"}
            </h2>
            
            <p className="text-gray-600">{message}</p>
            
            <div className="pt-4">
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
} 