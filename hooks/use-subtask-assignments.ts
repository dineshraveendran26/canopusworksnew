import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

export interface SubtaskAssignment {
  id: string
  subtask_id: string
  team_member_id: string  // Changed from user_id to match database schema
  assigned_at: string
  assigned_by?: string
}

export interface CreateSubtaskAssignmentData {
  subtask_id: string
  team_member_id: string  // Changed from user_id to match database schema
  assigned_by?: string
}

export function useSubtaskAssignments() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get all assignments for a specific subtask
  const getSubtaskAssignments = useCallback(async (subtaskId: string): Promise<string[]> => {
    try {
      setLoading(true)
      setError(null)

      // Skip database calls for temporary subtasks
      if (subtaskId.startsWith('temp-subtask-')) {
        console.log('🔄 SUBTASK ASSIGN - Skipping database call for temporary subtask:', subtaskId)
        return []
      }

      const { data, error: fetchError } = await supabase
        .from('subtask_assignments')
        .select('team_member_id')  // Changed from user_id to match database schema
        .eq('subtask_id', subtaskId)

      if (fetchError) {
        console.error('Error fetching subtask assignments:', fetchError)
        setError(fetchError.message)
        return []
      }

      return data?.map((assignment: { team_member_id: string }) => assignment.team_member_id) || []  // Changed from user_id
    } catch (err) {
      console.error('Error in getSubtaskAssignments:', err)
      setError('Failed to fetch subtask assignments')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Assign team members to a subtask
  const assignTeamMembersToSubtask = useCallback(async (
    subtaskId: string, 
    teamMemberIds: string[]  // Changed from userIds to teamMemberIds
  ): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to assign subtasks')
      return false
    }

    // Skip database calls for temporary subtasks
    if (subtaskId.startsWith('temp-subtask-')) {
      console.log('🔄 SUBTASK ASSIGN - Skipping database call for temporary subtask:', subtaskId)
      return true
    }

    console.log('🔍 SUBTASK ASSIGN DEBUG - subtaskId:', subtaskId)
    console.log('🔍 SUBTASK ASSIGN DEBUG - teamMemberIds:', teamMemberIds)

    try {
      setLoading(true)
      setError(null)

      // Get existing assignments first to avoid duplicates
      console.log('📋 SUBTASK ASSIGN - Getting current assignments...')
      const { data: currentAssignments, error: getCurrentError } = await supabase
        .from('subtask_assignments')
        .select('team_member_id')
        .eq('subtask_id', subtaskId)

      if (getCurrentError) {
        console.error('❌ Error getting current subtask assignments:', getCurrentError)
        setError(getCurrentError.message)
        return false
      }

      const currentTeamMemberIds = currentAssignments?.map(a => a.team_member_id) || []
      console.log('📋 Current subtask assignments:', currentTeamMemberIds)

      // Only create assignments for team members not already assigned
      const toAdd = teamMemberIds.filter(id => !currentTeamMemberIds.includes(id))
      console.log('➕ Subtask assignments to add:', toAdd)

      if (toAdd.length > 0) {
        // Create assignments for new team members only
        const assignments = toAdd.map(teamMemberId => ({
          subtask_id: subtaskId,
          team_member_id: teamMemberId,  // Changed from user_id to team_member_id
          assigned_at: new Date().toISOString(),
          assigned_by: user.id
        }))

        console.log('📝 SUBTASK ASSIGN - Creating new assignments:', assignments)

        const { error: insertError } = await supabase
          .from('subtask_assignments')
          .insert(assignments)

        if (insertError) {
          console.error('❌ Error assigning team members to subtask:', insertError)
          setError(insertError.message)
          return false
        }

        console.log('✅ SUBTASK ASSIGN - New assignments created successfully')
      } else {
        console.log('⏭️ SUBTASK ASSIGN - All team members already assigned')
      }

      return true
    } catch (err) {
      console.error('❌ Error in assignTeamMembersToSubtask:', err)
      setError('Failed to assign team members to subtask')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Update subtask assignments (replace all current assignments with new ones)
  const updateSubtaskAssignments = useCallback(async (
    subtaskId: string, 
    newTeamMemberIds: string[]  // Changed from newUserIds to newTeamMemberIds
  ): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to update subtask assignments')
      return false
    }

    // Skip database calls for temporary subtasks
    if (subtaskId.startsWith('temp-subtask-')) {
      console.log('🔄 SUBTASK ASSIGN - Skipping database call for temporary subtask:', subtaskId)
      return true
    }

    console.log('🔍 SUBTASK UPDATE DEBUG - subtaskId:', subtaskId)
    console.log('🔍 SUBTASK UPDATE DEBUG - newTeamMemberIds:', newTeamMemberIds)

    try {
      setLoading(true)
      setError(null)

      // First, remove all existing assignments for this subtask
      console.log('🗑️ SUBTASK UPDATE - Deleting existing assignments...')
      const { error: deleteError } = await supabase
        .from('subtask_assignments')
        .delete()
        .eq('subtask_id', subtaskId)

      if (deleteError) {
        console.error('❌ Error removing existing subtask assignments:', deleteError)
        setError(deleteError.message)
        return false
      }

      console.log('✅ SUBTASK UPDATE - Existing assignments deleted')

      // Then, create new assignments
      if (newTeamMemberIds.length > 0) {
        const assignments = newTeamMemberIds.map(teamMemberId => ({
          subtask_id: subtaskId,
          team_member_id: teamMemberId,  // Changed from user_id to team_member_id
          assigned_at: new Date().toISOString(),
          assigned_by: user.id
        }))

        console.log('📝 SUBTASK UPDATE - Creating new assignments:', assignments)

        const { error: insertError } = await supabase
          .from('subtask_assignments')
          .insert(assignments)

        if (insertError) {
          console.error('❌ Error creating new subtask assignments:', insertError)
          setError(insertError.message)
          return false
        }

        console.log('✅ SUBTASK UPDATE - New assignments created successfully')
      } else {
        console.log('⏭️ SUBTASK UPDATE - No new assignments to create')
      }

      console.log('🎉 SUBTASK UPDATE - Assignment update completed successfully')
      return true
    } catch (err) {
      console.error('❌ Error in updateSubtaskAssignments:', err)
      setError('Failed to update subtask assignments')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Remove specific assignments
  const removeSubtaskAssignments = useCallback(async (
    subtaskId: string, 
    teamMemberIds: string[]  // Changed from userIds to teamMemberIds
  ): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to remove subtask assignments')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('subtask_assignments')
        .delete()
        .eq('subtask_id', subtaskId)
        .in('team_member_id', teamMemberIds)  // Changed from user_id to team_member_id

      if (deleteError) {
        console.error('Error removing subtask assignments:', deleteError)
        setError(deleteError.message)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in removeSubtaskAssignments:', err)
      setError('Failed to remove subtask assignments')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Get all subtasks assigned to a specific team member
  const getSubtasksForTeamMember = useCallback(async (teamMemberId: string): Promise<string[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('subtask_assignments')
        .select('subtask_id')
        .eq('team_member_id', teamMemberId)  // Changed from user_id to team_member_id

      if (fetchError) {
        console.error('Error fetching subtasks for team member:', fetchError)
        setError(fetchError.message)
        return []
      }

      return data?.map((assignment: { subtask_id: string }) => assignment.subtask_id) || []
    } catch (err) {
      console.error('Error in getSubtasksForTeamMember:', err)
      setError('Failed to fetch subtasks for team member')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getSubtaskAssignments,
    assignTeamMembersToSubtask,
    updateSubtaskAssignments,
    removeSubtaskAssignments,
    getSubtasksForTeamMember,
  }
} 