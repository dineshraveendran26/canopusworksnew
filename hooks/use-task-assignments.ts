import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

export interface TaskAssignment {
  id: string
  task_id: string
  team_member_id: string  // Changed from user_id to match database schema
  assigned_at: string
  assigned_by?: string
  role: "assignee" | "reviewer" | "approver" | "observer"  // Updated to match database enum
}

export interface CreateTaskAssignmentData {
  task_id: string
  team_member_id: string  // Changed from user_id to match database schema
  assigned_by?: string
  role?: "assignee" | "reviewer" | "approver" | "observer"  // Updated to match database enum
}

export function useTaskAssignments() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get all assignments for a specific task
  const getTaskAssignments = useCallback(async (taskId: string): Promise<string[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('task_assignments')
        .select('team_member_id')  // Changed from user_id to match database schema
        .eq('task_id', taskId)

      if (fetchError) {
        console.error('Error fetching task assignments:', fetchError)
        setError(fetchError.message)
        return []
      }

      return data?.map((assignment: { team_member_id: string }) => assignment.team_member_id) || []  // Changed from user_id
    } catch (err) {
      console.error('Error in getTaskAssignments:', err)
      setError('Failed to fetch task assignments')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Assign users to a task
  const assignUsersToTask = useCallback(async (
    taskId: string, 
    teamMemberIds: string[],  // Changed from userIds to teamMemberIds
    role: "assignee" | "reviewer" | "approver" | "observer" = 'assignee'  // Updated role type
  ): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to assign tasks')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      // Create assignments for all team members
      const assignments = teamMemberIds.map(teamMemberId => ({
        task_id: taskId,
        team_member_id: teamMemberId,  // Changed from user_id to team_member_id
        assigned_at: new Date().toISOString(),
        assigned_by: user.id,
        role
      }))

      const { error: insertError } = await supabase
        .from('task_assignments')
        .insert(assignments)

      if (insertError) {
        console.error('Error assigning team members to task:', insertError)
        setError(insertError.message)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in assignUsersToTask:', err)
      setError('Failed to assign team members to task')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Update task assignments (replace all current assignments with new ones)
  const updateTaskAssignments = useCallback(async (
    taskId: string, 
    newTeamMemberIds: string[],  // Changed from newUserIds to newTeamMemberIds
    role: "assignee" | "reviewer" | "approver" | "observer" = 'assignee'  // Updated role type
  ): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to update task assignments')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      // First, remove all existing assignments for this task
      const { error: deleteError } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)

      if (deleteError) {
        console.error('Error removing existing assignments:', deleteError)
        setError(deleteError.message)
        return false
      }

      // Then, create new assignments
      if (newTeamMemberIds.length > 0) {
        const assignments = newTeamMemberIds.map(teamMemberId => ({
          task_id: taskId,
          team_member_id: teamMemberId,  // Changed from user_id to team_member_id
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
          role
        }))

        const { error: insertError } = await supabase
          .from('task_assignments')
          .insert(assignments)

        if (insertError) {
          console.error('Error creating new assignments:', insertError)
          setError(insertError.message)
          return false
        }
      }

      return true
    } catch (err) {
      console.error('Error in updateTaskAssignments:', err)
      setError('Failed to update task assignments')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Remove specific assignments
  const removeTaskAssignments = useCallback(async (
    taskId: string, 
    teamMemberIds: string[]  // Changed from userIds to teamMemberIds
  ): Promise<boolean> => {
    if (!user) {
      setError('User must be authenticated to remove task assignments')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .in('team_member_id', teamMemberIds)  // Changed from user_id to team_member_id

      if (deleteError) {
        console.error('Error removing task assignments:', deleteError)
        setError(deleteError.message)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in removeTaskAssignments:', err)
      setError('Failed to remove task assignments')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Get all tasks assigned to a specific team member
  const getTasksForTeamMember = useCallback(async (teamMemberId: string): Promise<string[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('team_member_id', teamMemberId)  // Changed from user_id to team_member_id

      if (fetchError) {
        console.error('Error fetching tasks for team member:', fetchError)
        setError(fetchError.message)
        return []
      }

      return data?.map((assignment: { task_id: string }) => assignment.task_id) || []
    } catch (err) {
      console.error('Error in getTasksForTeamMember:', err)
      setError('Failed to fetch tasks for team member')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    getTaskAssignments,
    assignUsersToTask,
    updateTaskAssignments,
    removeTaskAssignments,
    getTasksForTeamMember,
    clearError,
  }
} 