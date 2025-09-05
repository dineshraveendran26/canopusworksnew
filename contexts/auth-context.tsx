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
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 AuthProvider - Getting initial session...')
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 10000)
        )
        
        const sessionPromise = supabase.auth.getSession()
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        console.log('🔄 AuthProvider - Initial session:', { hasSession: !!session, userId: session?.user?.id })
        
        if (session?.user) {
          // Fetch user data from our users table to get role and other details
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name, avatar_url, role')
            .eq('id', session.user.id)
            .single()

          if (userError) {
            console.error('Error fetching user data:', userError)
            // Fallback to basic user data
            const fallbackUserData = {
              id: session.user.id,
              email: session.user.email!,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              avatar_url: session.user.user_metadata?.avatar_url,
              role: 'viewer' // Default role
            }
            console.log('🔄 AuthProvider - Setting fallback user:', fallbackUserData)
            setUser(fallbackUserData)
          } else {
            console.log('🔄 AuthProvider - Setting user from database:', userData)
            setUser(userData)
          }
        } else {
          console.log('🔄 AuthProvider - No initial session found')
          setUser(null)
        }
      } catch (error) {
        console.error('❌ AuthProvider - Error getting initial session:', error)
        setUser(null)
      } finally {
        setLoading(false)
        setInitialized(true)
        console.log('✅ AuthProvider - Initialization complete')
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log('🔄 AuthProvider - Auth state change:', { event, hasSession: !!session, userId: session?.user?.id })
        
        if (session?.user) {
          // Fetch user data from our users table to get role and other details
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name, avatar_url, role')
            .eq('id', session.user.id)
            .single()

          if (userError) {
            console.error('Error fetching user data:', userError)
            // Fallback to basic user data
            const fallbackUserData = {
              id: session.user.id,
              email: session.user.email!,
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              avatar_url: session.user.user_metadata?.avatar_url,
              role: 'viewer' // Default role
            }
            console.log('🔄 AuthProvider - Setting fallback user from auth change:', fallbackUserData)
            setUser(fallbackUserData)
          } else {
            console.log('🔄 AuthProvider - Setting user from auth change:', userData)
            setUser(userData)
          }
        } else {
          console.log('🔄 AuthProvider - Clearing user from auth change')
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Don't render children until we've initialized to prevent hydration mismatch
  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    )
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {
            full_name: email.split('@')[0]
          }
        }
      })
      
      if (error) {
        return { error: error.message }
      }
      
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔄 AuthProvider - signIn called with email:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('❌ AuthProvider - signIn error:', error)
        return { error: error.message }
      }
      
      console.log('🔄 AuthProvider - signIn successful, data:', { userId: data.user?.id, userEmail: data.user?.email })
      
      // Fetch complete user data from our users table
      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, full_name, avatar_url, role')
          .eq('id', data.user.id)
          .single()

        if (userError) {
          console.error('Error fetching user data after signIn:', userError)
          // Fallback to basic user data
          const fallbackUserData = {
            id: data.user.id,
            email: data.user.email!,
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
            avatar_url: data.user.user_metadata?.avatar_url,
            role: 'viewer' // Default role
          }
          console.log('🔄 AuthProvider - Setting fallback user after signIn:', fallbackUserData)
          setUser(fallbackUserData)
        } else {
          console.log('🔄 AuthProvider - Setting complete user after signIn:', userData)
          setUser(userData)
        }
      }
      
      // Ensure loading state is properly reset
      setLoading(false)
      console.log('✅ AuthProvider - signIn complete, loading state reset')
      
      return {}
    } catch (error) {
      console.error('❌ AuthProvider - signIn unexpected error:', error)
      setLoading(false) // Ensure loading is reset even on error
      return { error: 'An unexpected error occurred' }
    }
  }

  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        return { error: error.message }
      }
      
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      console.log('🔄 AuthProvider - signOut called')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      console.log('🔄 AuthProvider - signOut successful')
      // Don't redirect here - let the component handle it
    } catch (error) {
      console.error('❌ AuthProvider - signOut error:', error)
    }
  }

  const clearStaleTokens = async () => {
    try {
      console.log('🔄 AuthProvider - Clearing stale tokens...')
      await supabase.auth.signOut()
      setUser(null)
      console.log('🔄 AuthProvider - Stale tokens cleared')
    } catch (error) {
      console.error('❌ AuthProvider - Error clearing stale tokens:', error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) {
        return { error: error.message }
      }
      
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    resetPassword,
    clearStaleTokens
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 