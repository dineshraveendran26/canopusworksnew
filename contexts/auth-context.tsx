"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>
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
        
        const { data: { session } } = await supabase.auth.getSession()
        console.log('🔄 AuthProvider - Initial session:', { hasSession: !!session, userId: session?.user?.id })
        
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url
          }
          console.log('🔄 AuthProvider - Setting initial user:', userData)
          setUser(userData)
        } else {
          console.log('🔄 AuthProvider - No initial session found')
        }
      } catch (error) {
        console.error('❌ AuthProvider - Error getting initial session:', error)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthProvider - Auth state change:', { event, hasSession: !!session, userId: session?.user?.id })
        
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url
          }
          console.log('🔄 AuthProvider - Setting user from auth change:', userData)
          setUser(userData)
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

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0]
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
      
      // Update user state after successful sign in
      if (data.user) {
        const userData = {
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
          avatar_url: data.user.user_metadata?.avatar_url
        }
        console.log('🔄 AuthProvider - Setting user after signIn:', userData)
        setUser(userData)
      }
      
      return {}
    } catch (error) {
      console.error('❌ AuthProvider - signIn unexpected error:', error)
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