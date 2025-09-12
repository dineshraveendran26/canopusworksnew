import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export interface User {
  id: string
  email: string
  full_name: string
  initials: string
  role: 'administrator' | 'manager' | 'viewer'
  department: string
  phone?: string
  location?: string
  join_date: string
  status: 'active' | 'inactive'
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  full_name: string
  role: 'administrator' | 'manager' | 'viewer'
  department: string
  phone?: string
  location?: string
  join_date: string
}

export interface UpdateUserData {
  email?: string
  full_name?: string
  role?: 'administrator' | 'manager' | 'viewer'
  department?: string
  phone?: string
  location?: string
  join_date?: string
  status?: 'active' | 'inactive'
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if current user has admin permissions
  const hasAdminAccess = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.id) {
        console.log('No user or user ID found')
        return false
      }

      // For development, if we're using mock client, assume admin
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('Mock client detected, assuming admin access')
        return true
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !data) {
        console.log('Database query failed:', error)
        return false
      }
      return data.role === 'administrator'
    } catch (err) {
      console.error('Error checking admin access:', err)
      return false
    }
  }

  // Fetch all users (only for administrators)
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const isAdmin = await hasAdminAccess()
      if (!isAdmin) {
        console.log('User does not have admin access')
        // For development, show sample data instead of blocking
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: showing sample data')
          setUsers([
            {
              id: '1',
              email: 'admin@example.com',
              full_name: 'Admin User',
              initials: 'AU',
              role: 'administrator',
              department: 'IT',
              phone: '+1234567890',
              location: 'HQ',
              join_date: '2024-01-01',
              status: 'active',
              avatar_url: '',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ])
          setError(null)
          return
        }
        setError('Access denied. Administrator privileges required.')
        setUsers([])
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setUsers(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add new user (only for administrators)
  const addUser = async (userData: CreateUserData) => {
    try {
      setError(null)
      
      const isAdmin = await hasAdminAccess()
      if (!isAdmin) {
        throw new Error('Access denied. Administrator privileges required.')
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...userData,
          initials: userData.full_name.split(' ').map(n => n[0]).join('').toUpperCase(),
          status: 'active'
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      setUsers(prev => [data, ...prev])
      
      toast({
        title: "Success",
        description: "User added successfully!",
      })

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  // Update user (only for administrators)
  const updateUser = async (id: string, updates: UpdateUserData) => {
    try {
      setError(null)
      
      const isAdmin = await hasAdminAccess()
      if (!isAdmin) {
        throw new Error('Access denied. Administrator privileges required.')
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setUsers(prev => 
        prev.map(user => 
          user.id === id ? { ...user, ...data } : user
        )
      )
      
      toast({
        title: "Success",
        description: "User updated successfully!",
      })

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  // Delete user (only for administrators)
  const deleteUser = async (id: string) => {
    try {
      setError(null)
      
      const isAdmin = await hasAdminAccess()
      if (!isAdmin) {
        throw new Error('Access denied. Administrator privileges required.')
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      setUsers(prev => prev.filter(user => user.id !== id))
      
      toast({
        title: "Success",
        description: "User deleted successfully!",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  // Get user by ID
  const getUserById = async (id: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (err) {
      console.error('Error fetching user:', err)
      return null
    }
  }

  // Get current user's role
  const getCurrentUserRole = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !data) return null
      return data.role
    } catch (err) {
      console.error('Error getting current user role:', err)
      return null
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    getCurrentUserRole,
    hasAdminAccess,
    fetchUsers,
  }
}
