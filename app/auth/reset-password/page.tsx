"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkResetToken = async () => {
      // Supabase password reset links use hash fragments (#) instead of query parameters (?)
      // The format is: #access_token=...&refresh_token=...
      let accessToken = searchParams.get('access_token')
      let refreshToken = searchParams.get('refresh_token')
      
      console.log('🔍 Checking reset tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken })
      console.log('🔍 Hash:', window.location.hash)
      console.log('🔍 Search params:', Object.fromEntries(searchParams.entries()))
      console.log('🔍 Full URL:', window.location.href)
      
      // Additional fallback: check if tokens are in the URL path
      if (!accessToken || !refreshToken) {
        const urlPath = window.location.pathname
        const urlSearch = window.location.search
        console.log('🔍 URL path:', urlPath)
        console.log('🔍 URL search:', urlSearch)
        
        // Try to extract tokens from various locations
        const allParams = new URLSearchParams(urlSearch)
        const fallbackAccessToken = allParams.get('access_token')
        const fallbackRefreshToken = allParams.get('refresh_token')
        
        if (fallbackAccessToken && fallbackRefreshToken) {
          console.log('🔍 Found tokens in fallback location')
          accessToken = fallbackAccessToken
          refreshToken = fallbackRefreshToken
        }
        
        // Check hash fragments as well
        if (!accessToken || !refreshToken) {
          const hash = window.location.hash.substring(1)
          if (hash) {
            const hashParams = new URLSearchParams(hash)
            const hashAccessToken = hashParams.get('access_token')
            const hashRefreshToken = hashParams.get('refresh_token')
            
            if (hashAccessToken && hashRefreshToken) {
              console.log('🔍 Found tokens in hash fragment')
              accessToken = hashAccessToken
              refreshToken = hashRefreshToken
            }
          }
        }
      }
      
      if (accessToken && refreshToken) {
        try {
          console.log('🔍 Validating tokens with Supabase...')
          
          // Verify the tokens are valid
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            
            if (error) {
              console.error('❌ Token validation error:', error)
              setMessage("Invalid or expired reset link. Please request a new password reset.")
              setIsValidToken(false)
            } else if (data.session) {
              console.log('✅ Tokens validated successfully!')
              setIsValidToken(true)
              setMessage("Please enter your new password.")
            }
          } catch (error) {
            console.error('❌ Unexpected error during token validation:', error)
            setMessage("Invalid or expired reset link. Please request a new password reset.")
            setIsValidToken(false)
          }
        } catch (error) {
          console.error('❌ Unexpected error during token validation:', error)
          setMessage("Invalid or expired reset link. Please request a new password reset.")
          setIsValidToken(false)
        }
      } else {
        console.log('❌ No tokens found in URL')
        setMessage("Invalid reset link. Please request a new password reset.")
        setIsValidToken(false)
      }
    }

    checkResetToken()
  }, [searchParams])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match. Please try again.")
      return
    }
    
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long.")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage("Password updated successfully! Redirecting to login...")
        setIsSuccess(true)
        setTimeout(() => {
          router.push("/")
        }, 3000)
      }
    } catch (error) {
      console.error('Password update error:', error)
      setMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidToken) {
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
                <p className="text-lg text-gray-600 font-medium">Password Reset</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="space-y-4">
              <div className="text-red-600">
                <svg className="h-16 w-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-800">Invalid Reset Link</h2>
              
              <p className="text-gray-600">{message}</p>
              
              <div className="pt-4">
                <button
                  onClick={() => router.push("/")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              <p className="text-lg text-gray-600 font-medium">Set New Password</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div className="text-center mb-4">
              <p className="text-gray-600">{message}</p>
            </div>

            {/* New Password Field */}
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your new password"
                required
                minLength={6}
              />
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Confirm your new password"
                required
                minLength={6}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Updating Password...</span>
                </div>
              ) : (
                "Update Password"
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
} 