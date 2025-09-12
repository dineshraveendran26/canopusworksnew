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
  const [roleLoading, setRoleLoading] = useState(true)
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
        setRoleLoading(false)
          setError('Authentication timeout. Please refresh the page.')
        }
      }, 15000)
      
      try {
        console.log('🔄 AuthProvider - Starting initial session retrieval...')
        
        // Simplified session retrieval with comprehensive error handling
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ AuthProvider - Session Retrieval Error:', sessionError)
          
          // Handle refresh token errors specifically
          if (sessionError.message?.includes('Invalid Refresh Token') || 
              sessionError.message?.includes('Refresh Token Not Found')) {
            console.log('🔄 Clearing stale session due to refresh token error')
            await clearStaleSession()
            setError('Session expired. Please sign in again.')
          } else {
            setError(`Authentication Error: ${sessionError.message}`)
          }
          
          setLoading(false)
          setRoleLoading(false)
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
            role: undefined // No default role - will be set after database fetch
          }
          
          console.log('🔄 AuthProvider - Setting basic user:', basicUserData)
          setUser(basicUserData)
          
          // Optional: Fetch additional user data (with timeout and error handling)
          const additionalDataStart = Date.now()
          let retryCount = 0
          const maxRetries = 3
          
          const fetchUserData = async () => {
            try {
              const { data: userData, error: userError } = await Promise.race([
                supabase
                  .from('users')
                  .select('id, email, full_name, avatar_url, role')
                  .eq('id', session.user.id)
                  .single(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Database fetch timeout')), 5000))
              ])
              
              if (userError && retryCount < maxRetries) {
                retryCount++
                console.warn(`🔄 AuthProvider - Database User Fetch Error (attempt ${retryCount}/${maxRetries}):`, userError)
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                return fetchUserData()
              }
              
              return { userData, userError }
            } catch (error) {
              if (retryCount < maxRetries) {
                retryCount++
                console.warn(`🔄 AuthProvider - Database Fetch Error (attempt ${retryCount}/${maxRetries}):`, error)
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                return fetchUserData()
              }
              throw error
            }
          }
          
          try {
            const { userData, userError } = await fetchUserData()
            
            if (!isMounted) return
            
            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error (final):', userError)
              setError(`User Data Error: ${userError.message}`)
              // Set role loading to false and provide fallback role
              setRoleLoading(false)
              // Use the role we fetched earlier as fallback
              const fallbackUser = { ...user, role: role || 'user' }
              console.log('🔄 AuthProvider - Setting fallback role due to database error:', fallbackUser)
              setUser(fallbackUser)
            } else if (userData) {
              console.log('🔄 AuthProvider - Updating with database user:', {
                userData, 
                additionalDataTime: Date.now() - additionalDataStart,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })
              setUser(userData)
              setRoleLoading(false)
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
        setRoleLoading(false)
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
            role: undefined // No default role - will be set after database fetch
          }
          console.log('🔄 AuthProvider - Setting basic user from auth change:', basicUserData)
          setUser(basicUserData)
          
          // Try to fetch additional user data from database (non-blocking)
          let retryCount = 0
          const maxRetries = 2
          
          const fetchUserDataAuthChange = async () => {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, email, full_name, avatar_url, role')
                .eq('id', session.user.id)
                .single()
              
              if (userError && retryCount < maxRetries) {
                retryCount++
                console.warn(`🔄 AuthProvider - Database User Fetch Error on Auth Change (attempt ${retryCount}/${maxRetries}):`, userError)
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                return fetchUserDataAuthChange()
              }
              
              return { userData, userError }
            } catch (error) {
              if (retryCount < maxRetries) {
                retryCount++
                console.warn(`🔄 AuthProvider - Database Fetch Error on Auth Change (attempt ${retryCount}/${maxRetries}):`, error)
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                return fetchUserDataAuthChange()
              }
              throw error
            }
          }
          
          try {
            const { userData, userError } = await fetchUserDataAuthChange()
            
            if (!isMounted) return
            
            if (userError) {
              console.warn('🔄 AuthProvider - Database User Fetch Error on Auth Change (final):', userError)
              setError(`User Data Error: ${userError.message}`)
              // Set role loading to false and provide fallback role
              setRoleLoading(false)
              // If we have basic user data, set a fallback role to prevent infinite loading
              if (user) {
                const fallbackUser = { ...user, role: 'user' }
                console.log('🔄 AuthProvider - Setting fallback role due to database error (auth change):', fallbackUser)
                setUser(fallbackUser)
              }
            } else if (userData) {
              console.log('�� AuthProvider - Updating with database user from auth change:', {
                userData,
                retryCount,
                roleValue: userData?.role,
                roleType: typeof userData?.role
              })
              setUser(userData)
              setRoleLoading(false)
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
        setRoleLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const getUserRole = async (userId: string) => {
    try {
      // Try to get role from database first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (userData?.role) {
        return userData.role
      }
      
      // If database query fails, try to get from auth metadata
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.user_metadata?.role) {
        return authUser.user_metadata.role
      }
      
      // Default fallback
      return 'user'
    } catch (error) {
      console.warn('Failed to get user role:', error)
      return 'user'
    }
  }

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
