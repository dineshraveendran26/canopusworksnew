"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  setLoading: (loading: boolean) => void
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  clearStaleTokens: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const getInitialSession = async () => {
      const startTime = Date.now()
      console.time('🕒 AuthProvider - Total Initialization Time')
      
      // Overall timeout for the entire auth process
      const overallTimeout = setTimeout(() => {
        console.warn('🚨 EMERGENCY: Auth initialization timeout after 15 seconds')
        if (isMounted) {
          setLoading(false)
          setError('Authentication timeout. Please refresh the page.')
        }
      }, 15000)
      
      try {
        console.log('🔄 AuthProvider - Starting initial session retrieval...')
        
        // Simplified session retrieval with comprehensive error handling
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ AuthProvider - Session Retrieval Error:', sessionError)
          setError(`Authentication Error: ${sessionError.message}`)
          setLoading(false)
          return
        }

        const { session } = data
        
        console.log('🔄 AuthProvider - Session Retrieval:', {
          hasSession: !!session, 
          userId: session?.user?.id,
          retrievalTime: Date.now() - startTime
        })
        
        if (!isMounted) return

        if (session?.user) {
          // Simplified user data extraction
          const basicUserData = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url,
            role: 'viewer' // Default role
          }
          
          console.log('🔄 AuthProvider - Setting basic user:', basicUserData)
          setUser(basicUserData)
          
          // Optional: Fetch additional user data (with timeout and error handling)
          const additionalDataStart = Date.now()
          try {
            const { data: userData, error: userError } = await Promise.race([
              supabase
                .from('users')
                .select('id, email, full_name, avatar_url, role')
                .eq('id', session.user.id)
                .single(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Database fetch timeout')), 5000))
            ])
            
            if (!isMounted) return
            
            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error:', userError)
              setError(`User Data Error: ${userError.message}`)
            } else if (userData) {
              console.log('🔄 AuthProvider - Updating with database user:', {
                userData, 
                additionalDataTime: Date.now() - additionalDataStart
              })
              setUser(userData)
            }
          } catch (dbError) {
            console.error('🔄 AuthProvider - Database Fetch Error:', dbError)
            setError(`Database Error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
          }
        } else {
          console.log('🔄 AuthProvider - No initial session found')
          setUser(null)
        }
      } catch (error) {
        if (!isMounted) return
        console.error('❌ AuthProvider - Initialization Error:', error)
        setError(`Initialization Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setUser(null)
      } finally {
        clearTimeout(overallTimeout)
        if (isMounted) {
          setLoading(false)
          console.timeEnd('🕒 AuthProvider - Total Initialization Time')
          console.log('✅ AuthProvider - Initialization complete')
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (!isMounted) return
        
        console.log('🔄 AuthProvider - Auth state change:', { event, hasSession: !!session, userId: session?.user?.id })
        
        if (session?.user) {
          // Use basic user data from session first
          const basicUserData = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url,
            role: 'viewer' // Default role
          }
          console.log('🔄 AuthProvider - Setting basic user from auth change:', basicUserData)
          setUser(basicUserData)
          
          // Try to fetch additional user data from database (non-blocking)
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, full_name, avatar_url, role')
              .eq('id', session.user.id)
              .single()
            
            if (!isMounted) return
            
            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error on Auth Change:', userError)
              setError(`User Data Error: ${userError.message}`)
            } else if (userData) {
              console.log('🔄 AuthProvider - Updating with database user from auth change:', userData)
              setUser(userData)
            }
          } catch (dbError) {
            console.error('🔄 AuthProvider - Database Fetch Error on Auth Change:', dbError)
            setError(`Database Error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
          }
        } else {
          console.log('🔄 AuthProvider - Clearing user from auth change')
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      
      if (error) {
        console.error('Sign up error:', error)
        return { error: error.message }
      }
      
      return { error: undefined }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('Sign in error:', error)
        return { error: error.message }
      }
      
      return { error: undefined }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signInWithMagicLink = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        console.error('Magic link error:', error)
        return { error: error.message }
      }
      
      return { error: undefined }
    } catch (error) {
      console.error('Magic link error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) {
        console.error('Reset password error:', error)
        return { error: error.message }
      }
      
      return { error: undefined }
    } catch (error) {
      console.error('Reset password error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const clearStaleTokens = async () => {
    try {
      await supabase.auth.refreshSession()
    } catch (error) {
      console.error('Clear stale tokens error:', error)
    }
  }

  const value = {
    user,
    loading,
    error,
    setLoading,
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    resetPassword,
    clearStaleTokens
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
