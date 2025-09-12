'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, X, User, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  metadata: any
  is_read: boolean
  created_at: string
  read_at: string | null
}

interface PendingUser {
  id: string
  email: string
  full_name: string
  department: string
  phone: string
  join_date: string
  created_at: string
  notification_id: string
  request_date: string
}

export function NotificationBell() {
  const { user, roleLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [approvalDialog, setApprovalDialog] = useState(false)
  const [rejectionDialog, setRejectionDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Check if user is admin
  const isAdmin = user?.role === 'administrator'

  useEffect(() => {
    if (isAdmin) {
      fetchNotifications()
      fetchPendingUsers()
    }
  }, [isAdmin])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_user_approvals')

      if (error) throw error

      // Deduplicate users by ID - keep the most recent notification for each user
      const uniqueUsers = Array.from(
        new Map(
          (data || []).map((user: any) => [user.id, user])
        ).values()
      )
      
      console.log('📊 Notification Bell - Pending users:', { 
        total: data?.length || 0, 
        unique: uniqueUsers.length 
      })
      
      setPendingUsers(uniqueUsers)
    } catch (error) {
      console.error('Error fetching pending users:', error)
    }
  }

  const markNotificationRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      })

      if (error) throw error

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification read:', error)
    }
  }

  const handleApproveUser = async () => {
    if (!selectedUser) return

    setIsProcessing(true)
    try {
      const { error } = await supabase.rpc('approve_user', {
        p_user_id: selectedUser.id,
        p_approved_by: user?.id,
        p_new_role: selectedRole,
        p_rejection_reason: null
      })

      if (error) throw error

      // Refresh data
      await fetchNotifications()
      await fetchPendingUsers()
      
      setApprovalDialog(false)
      setSelectedUser(null)
      setSelectedRole('viewer')
    } catch (error) {
      console.error('Error approving user:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectUser = async () => {
    if (!selectedUser || !rejectionReason.trim()) return

    setIsProcessing(true)
    try {
      const { error } = await supabase.rpc('reject_user', {
        p_user_id: selectedUser.id,
        p_rejected_by: user?.id,
        p_rejection_reason: rejectionReason
      })

      if (error) throw error

      // Refresh data
      await fetchNotifications()
      await fetchPendingUsers()
      
      setRejectionDialog(false)
      setSelectedUser(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting user:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const openApprovalDialog = (pendingUser: PendingUser) => {
    setSelectedUser(pendingUser)
    setSelectedRole('viewer')
    setApprovalDialog(true)
  }

  const openRejectionDialog = (pendingUser: PendingUser) => {
    setSelectedUser(pendingUser)
    setRejectionReason('')
    setRejectionDialog(true)
  }

  if (!isAdmin) {
    return null
  }

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </DialogTitle>
            <DialogDescription>
              Manage user approval requests and view notification history
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Pending User Approvals */}
            {pendingUsers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Pending User Approvals ({pendingUsers.length})
                </h3>
                <div className="space-y-3">
                  {pendingUsers.map((pendingUser) => (
                    <Card key={pendingUser.id} className="border-orange-200 bg-orange-50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-orange-600" />
                              <span className="font-medium">{pendingUser.full_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {pendingUser.department}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{pendingUser.email}</p>
                            {pendingUser.phone && (
                              <p className="text-sm text-gray-600 mb-2">Phone: {pendingUser.phone}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              Requested: {new Date(pendingUser.request_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => openApprovalDialog(pendingUser)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRejectionDialog(pendingUser)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Notification History */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Notification History</h3>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notifications yet</p>
                ) : (
                  notifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`${!notification.is_read ? 'border-blue-200 bg-blue-50' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{notification.title}</span>
                              {!notification.is_read && (
                                <Badge variant="secondary" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {new Date(notification.created_at).toLocaleString()}
                            </div>
                          </div>
                          {!notification.is_read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markNotificationRead(notification.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Approve this user registration and assign a role
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedUser.full_name}</h4>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                <p className="text-sm text-gray-600">Department: {selectedUser.department}</p>
                {selectedUser.phone && (
                  <p className="text-sm text-gray-600">Phone: {selectedUser.phone}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Assign Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The user will receive a password reset email and can then log in with the assigned role.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setApprovalDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveUser}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? 'Approving...' : 'Approve User'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onOpenChange={setRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User</DialogTitle>
            <DialogDescription>
              Reject this user registration with a reason
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedUser.full_name}</h4>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                <p className="text-sm text-gray-600">Department: {selectedUser.department}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notification-rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="notification-rejection-reason"
                  name="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={3}
                  autoComplete="off"
                  required
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The user will be notified of the rejection and the reason provided.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRejectionDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectUser}
                  disabled={isProcessing || !rejectionReason.trim()}
                  variant="destructive"
                >
                  {isProcessing ? 'Rejecting...' : 'Reject User'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
