'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Handle password reset with URL parameters
    const handlePasswordReset = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const tokenHash = urlParams.get('token_hash')
        const type = urlParams.get('type')
        
        console.log('Password reset URL params:', { code, tokenHash, type })
        
        console.log('Password reset URL params:', { code, tokenHash, type })
        
        if (tokenHash && type === 'recovery') {
          // PKCE flow - verify the token hash
          console.log('Attempting to verify token hash for PKCE flow:', tokenHash)
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          })
          
          if (error) {
            console.error('Error verifying token hash:', error)
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
            return
          }
          
          if (data.session) {
            console.log('Password reset session established successfully via PKCE')
            setIsValidToken(true)
            setMessage('Please enter your new password.')
          } else {
            console.log('No session returned from token hash verification')
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        } else if (code) {
          // Implicit flow - exchange code for session
          console.log('Attempting to exchange code for session:', code)
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Error exchanging code for session:', error)
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
            return
          }
          
          if (data.session) {
            console.log('Password reset session established successfully via implicit flow')
            setIsValidToken(true)
            setMessage('Please enter your new password.')
          } else {
            console.log('No session returned from code exchange')
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        } else {
          // Check if we already have a valid session
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('Existing session found')
            setIsValidToken(true)
            setMessage('Please enter your new password.')
          } else {
            console.log('No valid parameters found and no existing session')
            setMessage('Invalid or expired reset link. Please request a new password reset.')
            setIsError(true)
          }
        }
      } catch (error) {
        console.error('Error handling password reset:', error)
        setMessage('Invalid or expired reset link. Please request a new password reset.')
        setIsError(true)
      }
    }

    handlePasswordReset()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValidToken) {
      setMessage('Invalid reset link. Please request a new password reset.')
      setIsError(true)
      return
    }
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setIsError(true)
      setIsSuccess(false)
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long')
      setIsError(true)
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setMessage('')
    setIsError(false)
    setIsSuccess(false)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      setMessage('Password updated successfully! Redirecting to the application...')
      setIsSuccess(true)
      setIsError(false)
      setIsRedirecting(true)
      
      // Clear form
      setPassword('')
      setConfirmPassword('')
      
      // Redirect to the main application after 2 seconds
      setTimeout(() => {
        window.location.href = '/kanban'
      }, 2000)
      
    } catch (error) {
      console.error('Error updating password:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to update password')
      setIsError(true)
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidToken && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-600">Canopus Works</h1>
                <p className="text-sm text-gray-600">Password Reset</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-blue-600">Canopus Works</h1>
              <p className="text-sm text-gray-600">Password Reset</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isSuccess ? (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {isRedirecting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    <span>{message}</span>
                  </div>
                ) : (
                  message
                )}
              </AlertDescription>
            </Alert>
          ) : isError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                disabled={isRedirecting}
                className="text-foreground bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                disabled={isRedirecting}
                className="text-foreground bg-background"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || isRedirecting}
            >
              {isLoading ? 'Updating Password...' : isRedirecting ? 'Redirecting...' : 'Update Password'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 