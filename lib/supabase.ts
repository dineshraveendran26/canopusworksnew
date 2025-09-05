import { createClient } from '@supabase/supabase-js'

// Create a mock Supabase client for development when environment variables are missing
const createMockClient = () => {
  console.warn('⚠️ Supabase environment variables not found. Using mock client for development.')
  
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: async () => ({ data: { user: null }, error: { message: 'Mock client - Supabase not configured' } }),
      signIn: async () => ({ data: { user: null }, error: { message: 'Mock client - Supabase not configured' } }),
      signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Mock client - Supabase not configured' } }),
      signInWithOtp: async () => ({ data: { user: null }, error: { message: 'Mock client - Supabase not configured' } }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
      setSession: async () => ({ data: { user: null }, error: { message: 'Mock client - Supabase not configured' } }),
      updateUser: async () => ({ data: { user: null }, error: { message: 'Mock client - Supabase not configured' } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      insert: () => ({ select: async () => ({ data: null, error: null }) }),
      update: () => ({ eq: () => ({ select: async () => ({ data: null, error: null }) }) }),
      delete: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
    rpc: (funcName: string, params?: any) => ({
      data: null,
      error: { message: `Mock client - RPC function ${funcName} not available` }
    }),
    // Add real-time channel support to mock client
    channel: (name: string) => ({
      on: () => ({
        subscribe: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      }),
      subscribe: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    }),
    removeChannel: () => {},
  } as any
}

// Create the actual Supabase client if environment variables are available
const createRealClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
}

// Function to get the appropriate client based on current environment variables
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (supabaseUrl && supabaseAnonKey) {
    try {
      return createRealClient()
    } catch (error) {
      console.error('❌ Error creating real Supabase client:', error)
      return createMockClient()
    }
  } else {
    return createMockClient()
  }
}

// Export the client
export const supabase = getSupabaseClient()

// Note: Team member types are now defined in hooks/use-team-members.ts
// to match the actual database schema 