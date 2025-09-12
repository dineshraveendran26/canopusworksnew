import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

// Updated interfaces for team_members table
export interface TeamMember {
  id: string
  full_name: string
  email: string
  phone?: string
  role: string
  department: string
  position?: string
  employee_id?: string
  hire_date?: string
  status: 'active' | 'inactive' | 'on_leave' | 'terminated'
  location?: string
  supervisor_id?: string
  avatar_url?: string
  skills?: string[]
  certifications?: string[]
  created_at: string
  updated_at: string
  user_id?: string
}

export interface CreateTeamMemberData {
  full_name: string
  email: string
  phone?: string
  role: string
  department: string
  position?: string
  employee_id?: string
  hire_date?: string
  status?: 'active' | 'inactive' | 'on_leave' | 'terminated'
  location?: string
  supervisor_id?: string
  avatar_url?: string
  skills?: string[]
  certifications?: string[]
  user_id?: string
}

export interface UpdateTeamMemberData {
  full_name?: string
  email?: string
  phone?: string
  role?: string
  department?: string
  position?: string
  employee_id?: string
  hire_date?: string
  location?: string
  supervisor_id?: string
  avatar_url?: string
  skills?: string[]
  certifications?: string[]
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch all team members
  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check authentication status first
      const { data: { session } } = await supabase.auth.getSession()
      const isAuthenticated = !!session?.user
      
      // Try to fetch from Supabase first
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Supabase fetch error:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        if (error.code === '42501') {
          setError('Permission denied. You may not have access to view team members.')
        } else if (error.code === 'PGRST116') {
          setError('Database connection failed. Please check your connection.')
        } else {
          setError(`Database error: ${error.message}`)
        }
        
        // Fallback to local data on error
        // setTeamMembers(TEAM_MEMBERS) // Removed local fallback
        return
      }

      if (data && data.length > 0) {
        // Validate that data has required fields
        const validData = data.filter((item: any) => item && item.id && item.full_name)
        if (validData.length > 0) {
          setTeamMembers(validData)
          setError(null)
        } else {
          setError('Invalid data from database, showing local data')
        }
      } else {
        setError('No data found in database, showing local data')
      }
    } catch (err) {
      console.error('❌ Supabase connection failed:', err)
      setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      // Fallback to local data on error
      // setTeamMembers(TEAM_MEMBERS) // Removed local fallback
    } finally {
      setLoading(false)
    }
  }

  // Add new team member
  const addTeamMember = async (memberData: CreateTeamMemberData) => {
    try {
      setError(null)
      
      // Check authentication status first
      const { data: { session } } = await supabase.auth.getSession()
      const isAuthenticated = !!session?.user
      
      // Ensure required fields are present and properly formatted
      const sanitizedData = {
        full_name: memberData.full_name.trim(),
        email: memberData.email.trim().toLowerCase(),
        phone: memberData.phone?.trim() || null,
        role: memberData.role.trim(),
        department: memberData.department.trim(),
        position: memberData.position?.trim() || null,
        employee_id: memberData.employee_id?.trim() || null,
        hire_date: memberData.hire_date || new Date().toISOString().split('T')[0],
        status: memberData.status || 'inactive',
        location: memberData.location?.trim() || null,
        supervisor_id: memberData.supervisor_id || null,
        avatar_url: memberData.avatar_url || null,
        skills: memberData.skills || [],
        certifications: memberData.certifications || [],
        user_id: session?.user?.id || null,
      }
      
      // Try Supabase insert
      const { data, error } = await supabase
        .from('team_members')
        .insert([sanitizedData])
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase insert error:', error)
        
        // Provide more specific error messages
        if (error.code === '42501') {
          throw new Error('Permission denied. You may not have the right to insert team members.')
        } else if (error.code === '23505') {
          throw new Error('A team member with this email already exists.')
        } else if (error.code === '23502') {
          throw new Error('Required fields are missing. Please fill in all required fields.')
        } else {
          throw new Error(`Database error: ${error.message}`)
        }
      }
      
      // Update local state with the new data from Supabase
      setTeamMembers(prev => [data, ...prev])
      
      toast({
        title: "Success",
        description: "Team member added successfully to database!",
      })

      return data
    } catch (err) {
      console.error('❌ Supabase operation failed:', err)
      
      // Fallback to local storage
      const newMember: TeamMember = {
        id: Date.now().toString(),
        full_name: memberData.full_name,
        email: memberData.email,
        phone: memberData.phone,
        role: memberData.role,
        department: memberData.department,
        position: memberData.position,
        employee_id: memberData.employee_id,
        hire_date: memberData.hire_date || new Date().toISOString().split('T')[0],
        status: 'inactive',
        location: memberData.location,
        supervisor_id: memberData.supervisor_id,
        avatar_url: memberData.avatar_url,
        skills: memberData.skills || [],
        certifications: memberData.certifications || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: undefined,
      }
      
      setTeamMembers(prev => [newMember, ...prev])
      
      toast({
        title: "Warning",
        description: err instanceof Error ? err.message : "Team member added to local storage only. Database connection failed.",
      })

      return newMember
    }
  }

  // Update team member
  const updateTeamMember = async (id: string, updates: UpdateTeamMemberData) => {
    try {
      setError(null)
      
      // Try Supabase first
      const { data, error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setTeamMembers(prev => 
        prev.map(member => 
          member.id === id ? { ...member, ...data } : member
        )
      )
      
      toast({
        title: "Success",
        description: "Team member updated successfully!",
      })

      return data
    } catch (err) {
      console.warn('Supabase connection failed, using local storage:', err)
      
      // Fallback to local storage update
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === id ? { ...member, ...updates } : member
        )
      )
      
      toast({
        title: "Success",
        description: "Team member updated in local storage!",
      })

      return { id, ...updates } as TeamMember
    }
  }

  // Delete team member
  const deleteTeamMember = async (id: string) => {
    try {
      setError(null)
      
      // Try Supabase first
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      setTeamMembers(prev => prev.filter(member => member.id !== id))
      
      toast({
        title: "Success",
        description: "Team member deleted successfully!",
      })
    } catch (err) {
      console.warn('Supabase connection failed, using local storage:', err)
      
      // Fallback to local storage delete
      setTeamMembers(prev => prev.filter(member => member.id !== id))
      
      toast({
        title: "Success",
        description: "Team member deleted from local storage!",
      })
    }
  }

  // Search team members
  const searchTeamMembers = async (query: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Try Supabase first
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%,department.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        setTeamMembers(data)
      } else {
        // Fallback to local search
        // const filtered = TEAM_MEMBERS.filter(member =>  // Removed local fallback
        //   member.full_name.toLowerCase().includes(query.toLowerCase()) ||
        //   member.email.toLowerCase().includes(query.toLowerCase()) ||
        //   member.role.toLowerCase().includes(query.toLowerCase()) ||
        //   member.department.toLowerCase().includes(query.toLowerCase())
        // )
        // setTeamMembers(filtered)
        setError('No data found for search query in database.')
      }
    } catch (err) {
      console.warn('Supabase connection failed, using local search:', err)
      // Fallback to local search
      // const filtered = TEAM_MEMBERS.filter(member =>  // Removed local fallback
      //   member.full_name.toLowerCase().includes(query.toLowerCase()) ||
      //   member.email.toLowerCase().includes(query.toLowerCase()) ||
      //   member.role.toLowerCase().includes(query.toLowerCase()) ||
      //   member.department.toLowerCase().includes(query.toLowerCase())
      // )
      // setTeamMembers(filtered)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  // Filter team members by status
  const filterByStatus = async (status: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Try Supabase first
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        setTeamMembers(data)
      } else {
        // Fallback to local filtering
        // const filtered = TEAM_MEMBERS.filter(member =>  // Removed local fallback
        //   member.status === status
        // )
        // setTeamMembers(filtered)
        setError('No data found for status filter in database.')
      }
    } catch (err) {
      console.warn('Supabase connection failed, using local filtering:', err)
      // Fallback to local filtering
      // const filtered = TEAM_MEMBERS.filter(member =>  // Removed local fallback
      //   member.status === status
      // )
      // setTeamMembers(filtered)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  // Filter team members by department
  const filterByDepartment = async (department: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Try Supabase first
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        setTeamMembers(data)
      } else {
        // Fallback to local filtering
        // const filtered = TEAM_MEMBERS.filter(member =>  // Removed local fallback
        //   member.department === department
        // )
        // setTeamMembers(filtered)
        setError('No data found for department filter in database.')
      }
    } catch (err) {
      console.warn('Supabase connection failed, using local filtering:', err)
      // Fallback to local filtering
      // const filtered = TEAM_MEMBERS.filter(member =>  // Removed local fallback
      //   member.department === department
      // )
      // setTeamMembers(filtered)
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  // Reset filters and show all team members
  const resetFilters = () => {
    fetchTeamMembers()
  }

  // Subscribe to real-time changes
  useEffect(() => {
    // Only fetch and setup realtime if we have a session
    const setupDataAndRealtime = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
                  setTeamMembers([])
        setLoading(false)
        return null
      }
      
      // Fetch team members first
      await fetchTeamMembers()
        
        const channel = supabase
          .channel('team_members_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'team_members'
            },
            (payload: any) => {
              if (payload.eventType === 'INSERT') {
                setTeamMembers(prev => [payload.new as TeamMember, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                setTeamMembers(prev => 
                  prev.map(member => 
                    member.id === payload.new.id ? payload.new as TeamMember : member
                  )
                )
              } else if (payload.eventType === 'DELETE') {
                setTeamMembers(prev => 
                  prev.filter(member => member.id !== payload.old.id)
                )
              }
            }
          )
          .subscribe((status: any) => {
            // Handle subscription status silently to reduce console noise
            if (status === 'CHANNEL_ERROR') {
              // This is normal in development or when RLS is strict
            }
          })
          
        return channel
      } catch (error) {
        // Continue without realtime - it's not critical for basic functionality
        return null
      }
    }

    let channel: any = null
    
    setupDataAndRealtime().then(ch => {
      channel = ch
    })

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch (error) {
          console.error('❌ Error removing channel:', error)
        }
      }
    }
  }, []) // Empty dependency array is fine since we check auth inside

  return {
    teamMembers,
    loading,
    error,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    searchTeamMembers,
    filterByStatus,
    filterByDepartment,
    resetFilters,
    fetchTeamMembers,
  }
} 