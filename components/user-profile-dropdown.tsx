"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, User, Users, Palette, LogOut, Sun, Moon, Monitor, X, UserCheck, Plus, Search, Mail, Shield, Edit, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import { PhotoUpload } from "./photo-upload"
import { useTeamMembers } from "@/hooks/use-team-members"
import { useUsers } from "@/hooks/use-users"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { DialogTitle } from "./ui/dialog"
import { supabase } from "@/lib/supabase"

export function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [showTeamMembers, setShowTeamMembers] = useState(false)
  const [showUsers, setShowUsers] = useState(false)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddTeamMember, setShowAddTeamMember] = useState(false)
  const [teamMembersSearchQuery, setTeamMembersSearchQuery] = useState("")
  const [usersSearchQuery, setUsersSearchQuery] = useState("")
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const { teamMembers, addTeamMember, fetchTeamMembers, error, loading } = useTeamMembers()
  const { user, signOut } = useAuth()
  const { hasAdminAccess } = useUsers()
  const [isAdmin, setIsAdmin] = useState(false)

  // Check admin access when component mounts
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (user) {
        try {
          const adminStatus = await hasAdminAccess()
          setIsAdmin(adminStatus)
        } catch (error) {
          // If there's an error (like mock client), assume admin for development
          console.log('Admin check failed, assuming admin for development:', error)
          setIsAdmin(true)
        }
      }
    }
    checkAdminAccess()
  }, [user, hasAdminAccess])

  // Fetch users when Users modal is opened
  useEffect(() => {
    if (showUsers && isAdmin) {
      fetchUsers()
    }
  }, [showUsers, isAdmin])

  // Use real user data from auth context
  const userPhoto: string | undefined = user?.avatar_url
  const userProfile = {
    fullName: user?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || 'user@example.com',
    phone: "+1 (555) 123-4567", // Keep placeholder for now
    designation: "Senior Engineer", // Keep placeholder for now
    userPhoto: userPhoto || undefined,
    initials: user?.full_name?.split(' ').map(n => n[0]).join('') || (user?.email ? user.email.charAt(0).toUpperCase() : 'U'),
    userRole: 'User' // Default role since auth context doesn't have role info
  }

  // New team member form state
  const [newTeamMember, setNewTeamMember] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    position: "",
    employee_id: "",
    location: ""
  })

  // New user form state
  const [newUser, setNewUser] = useState({
    first_name: "",
    last_name: "",
    title: "",
    email: "",
    phone: "",
    role: "viewer",
    department: ""
  })

  // Filter team members based on search query
  const filteredTeamMembers = (teamMembers || []).filter(member => {
    if (!teamMembersSearchQuery.trim()) return true
    
    const query = teamMembersSearchQuery.toLowerCase()
    return (
      member.full_name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.role?.toLowerCase().includes(query) ||
      member.department?.toLowerCase().includes(query) ||
      (member.phone && member.phone.toLowerCase().includes(query)) ||
      (member.location && member.location.toLowerCase().includes(query))
    )
  })

  // Filter users based on search query
  const filteredUsers = (users || []).filter(user => {
    if (!usersSearchQuery.trim()) return true
    
    const query = usersSearchQuery.toLowerCase()
    return (
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query) ||
      user.department?.toLowerCase().includes(query)
    )
  })

  // Fetch users from database
  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // If there's an error (like mock client), show sample data for development
        console.log('Database fetch failed, showing sample data for development:', error)
        setUsers([
          {
            id: '1',
            first_name: 'Dinesh',
            last_name: 'Raveendran',
            title: 'Senior Engineer',
            email: 'dineshraveendran26@gmail.com',
            phone: '+1 (555) 123-4567',
            role: 'administrator',
            department: 'Engineering',
            is_active: true,
            created_at: new Date().toISOString()
          }
        ])
        return
      }
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      // Show sample data for development
      setUsers([
        {
          id: '1',
          first_name: 'Dinesh',
          last_name: 'Raveendran',
          title: 'Senior Engineer',
          email: 'dineshraveendran26@gmail.com',
          phone: '+1 (555) 123-4567',
          role: 'administrator',
          department: 'Engineering',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Handle adding new user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Validate required fields
      if (!newUser.first_name.trim() || !newUser.last_name.trim() || !newUser.email.trim()) {
        alert("Please fill in all required fields.")
        return
      }

      // Check if we're using mock client
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Mock client - simulate user creation
        const mockUser = {
          id: Date.now().toString(),
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          title: newUser.title,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          department: newUser.department,
          is_active: true,
          created_at: new Date().toISOString()
        }
        
        setUsers(prev => [mockUser, ...prev])
        
        // Reset form and close modal
        setNewUser({
          first_name: "",
          last_name: "",
          title: "",
          email: "",
          phone: "",
          role: "viewer",
          department: ""
        })
        setShowAddUser(false)
        
        alert("User created successfully! (Mock mode - no email sent)")
        return
      }

      // Create user using the database function
      const { data, error } = await supabase.rpc('create_user_with_invitation', {
        p_first_name: newUser.first_name,
        p_last_name: newUser.last_name,
        p_title: newUser.title,
        p_email: newUser.email,
        p_phone: newUser.phone || null,
        p_role: newUser.role,
        p_department: newUser.department || null,
        p_created_by: user?.id
      })

      if (error) throw error

      // Reset form and close modal
      setNewUser({
        first_name: "",
        last_name: "",
        title: "",
        email: "",
        phone: "",
        role: "viewer",
        department: ""
      })
      setShowAddUser(false)
      
      // Refresh users list
      await fetchUsers()
      
      // Show success message
      alert("User created successfully! An invitation email will be sent.")
      
    } catch (error) {
      console.error("Error adding user:", error)
      alert(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle editing user
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingUser) return
    
    try {
      // Check if we're using mock client
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Mock client - simulate user update
        setUsers(prev => prev.map(user => 
          user.id === editingUser.id ? { ...user, ...editingUser } : user
        ))
        
        // Reset form and close modal
        setEditingUser(null)
        setShowAddUser(false)
        
        alert("User updated successfully! (Mock mode)")
        return
      }

      const { error } = await supabase
        .from('users')
        .update({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          title: editingUser.title,
          phone: editingUser.phone,
          role: editingUser.role,
          department: editingUser.department
        })
        .eq('id', editingUser.id)

      if (error) throw error

      // Reset form and close modal
      setEditingUser(null)
      setShowAddUser(false)
      
      // Refresh users list
      await fetchUsers()
      
      // Show success message
      alert("User updated successfully!")
      
    } catch (error) {
      console.error("Error updating user:", error)
      alert(`Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle deleting user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    try {
      // Check if we're using mock client
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Mock client - simulate user deletion
        setUsers(prev => prev.filter(user => user.id !== userId))
        alert("User deleted successfully! (Mock mode)")
        return
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      // Refresh users list
      await fetchUsers()
      
      // Show success message
      alert("User deleted successfully!")
      
    } catch (error) {
      console.error("Error deleting user:", error)
      alert(`Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle adding new team member
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      console.log("Submitting team member data:", newTeamMember)
      
      // Validate required fields
      if (!newTeamMember.full_name.trim()) {
        alert("Please enter a full name for the team member.")
        return
      }
      
      if (!newTeamMember.email.trim()) {
        alert("Please enter an email for the team member.")
        return
      }
      
      if (!newTeamMember.role.trim()) {
        alert("Please enter a role for the team member.")
        return
      }
      
      if (!newTeamMember.department.trim()) {
        alert("Please select a department for the team member.")
        return
      }
      
      // Add current date as hire_date and set default status
      const teamMemberData = {
        ...newTeamMember,
        hire_date: new Date().toISOString().split('T')[0],
        status: 'inactive' as const // Default status
      }
      
      console.log("Sending to Supabase:", teamMemberData)
      
      // Call the addTeamMember function from the hook
      const result = await addTeamMember(teamMemberData)
      
      console.log("Supabase response:", result)
      
      // Reset form and close modal
      setNewTeamMember({
        full_name: "",
        email: "",
        phone: "",
        role: "",
        department: "",
        position: "",
        employee_id: "",
        location: ""
      })
      setShowAddTeamMember(false)
      
      // Show success message
      alert("Team member added successfully! The new member will appear in the team members list.")
      
    } catch (error) {
      console.error("Error adding team member:", error)
      
      // More specific error handling
      let errorMessage = "Unknown error occurred"
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          errorMessage = "A team member with this email already exists."
        } else if (error.message.includes('violates not-null constraint')) {
          errorMessage = "Please fill in all required fields (marked with *)."
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = "Invalid data format. Please check your inputs."
        } else {
          errorMessage = error.message
        }
      }
      
      // Show error message with more details
      alert(`Error adding team member: ${errorMessage}\n\nPlease check the console for more details.`)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      setIsOpen(false)
      // The auth context will handle the redirect
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "inactive":
        return "bg-gray-500"
      case "on_leave":
        return "bg-yellow-500"
      case "terminated":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      case "on_leave":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "terminated":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "administrator":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "viewer":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="relative">
          {userProfile.userPhoto ? (
            <img
              src={userProfile.userPhoto}
              alt={userProfile.fullName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {userProfile.initials}
              </span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-foreground">{userProfile.fullName}</p>
          <p className="text-xs text-muted-foreground">{userProfile.designation}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              {userProfile.userPhoto ? (
                <img
                  src={userProfile.userPhoto}
                  alt={userProfile.fullName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xl">
                    {userProfile.initials}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{userProfile.fullName}</h3>
                <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                <p className="text-sm text-muted-foreground">{userProfile.phone}</p>
                <p className="text-sm text-muted-foreground">{userProfile.designation}</p>
                <Badge variant="secondary" className="mt-1">
                  {userProfile.userRole}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {/* Photo Upload */}
            <button
              onClick={() => setShowPhotoUpload(true)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-foreground">Update Photo</span>
            </button>

            {/* Team Members */}
            <button
              onClick={() => setShowTeamMembers(true)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-foreground">Team Members</span>
            </button>

            {/* Users Management - Only for Administrators */}
            {(isAdmin || process.env.NODE_ENV === 'development') && (
              <button
                onClick={() => setShowUsers(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <UserCheck className="h-5 w-5 text-muted-foreground" />
                <span className="text-foreground">Users</span>
              </button>
            )}

            {/* Theme Toggle */}
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <span className="text-foreground flex-1">Theme</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-2 rounded ${theme === "light" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                >
                  <Sun className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-2 rounded ${theme === "dark" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                >
                  <Moon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`p-2 rounded ${theme === "system" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                >
                  <Monitor className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Team Members Modal */}
      {showTeamMembers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden mx-4">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Team Members</h2>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => fetchTeamMembers()} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </Button>
                  <Button onClick={() => setShowAddTeamMember(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Add New Member
                  </Button>
                  <button
                    onClick={() => setShowTeamMembers(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            {error && (
              <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm font-medium">Connection Status: {error}</span>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-border">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search team members..."
                  value={teamMembersSearchQuery}
                  onChange={(e) => setTeamMembersSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {teamMembersSearchQuery && (
                  <button
                    onClick={() => setTeamMembersSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Member</th>
                      <th className="text-left p-4 font-medium">Role</th>
                      <th className="text-left p-4 font-medium">Department</th>
                      <th className="text-left p-4 font-medium">Contact</th>
                      <th className="text-left p-4 font-medium">Location</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeamMembers.map((member) => (
                      <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                  {member.full_name.split(' ').map((n: string) => n[0]).join('')}
                                </span>
                              </div>
                              <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(member.status)}`}></div>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{member.full_name}</p>
                              <p className="text-sm text-muted-foreground">Joined {member.hire_date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-foreground">{member.role}</td>
                        <td className="py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{member.department}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-foreground">{member.email}</p>
                            <p className="text-sm text-muted-foreground">{member.phone || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-foreground">{member.location}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(member.status)}`}>
                            {member.status?.charAt(0)?.toUpperCase() + member.status?.slice(1) || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-foreground">{member.hire_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Update Photo</h2>
              <button
                onClick={() => setShowPhotoUpload(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-center mb-6">
              <PhotoUpload
                currentPhotoUrl={userProfile.userPhoto}
                onPhotoChange={(photoUrl) => {
                  console.log("Photo uploaded:", photoUrl)
                  setShowPhotoUpload(false)
                }}
                size="lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Users Management Modal */}
      {showUsers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-[95vw] max-w-6xl max-h-[85vh] bg-background rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">Users Management</h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddUser(true)} className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Add New User
                </Button>
                <Button variant="outline" onClick={() => setShowUsers(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-border">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={usersSearchQuery}
                  onChange={(e) => setUsersSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {usersSearchQuery && (
                  <button
                    onClick={() => setUsersSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(85vh-180px)]">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Loading users...</span>
                </div>
              ) : (
                <div className="rounded-lg border">
                  <div className="grid grid-cols-7 gap-4 p-4 font-semibold text-sm text-muted-foreground border-b bg-muted/50">
                    <div>User</div>
                    <div>Email</div>
                    <div>Role</div>
                    <div>Department</div>
                    <div>Status</div>
                    <div>Created</div>
                    <div>Actions</div>
                  </div>
                  
                  <div className="divide-y">
                    {filteredUsers.map((userItem) => (
                      <div key={userItem.id} className="grid grid-cols-7 gap-4 p-4 items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {userItem.first_name?.[0]}{userItem.last_name?.[0] || userItem.email?.[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{userItem.first_name} {userItem.last_name}</p>
                            <p className="text-sm text-muted-foreground">{userItem.title || 'No title'}</p>
                          </div>
                        </div>
                        <div className="text-sm">{userItem.email}</div>
                        <div><Badge className={getRoleBadgeColor(userItem.role)}>{userItem.role}</Badge></div>
                        <div className="text-sm">{userItem.department || 'N/A'}</div>
                        <div>
                          <Badge className={userItem.is_active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}>
                            {userItem.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(userItem.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => {
                              setEditingUser(userItem)
                              setNewUser({
                                first_name: userItem.first_name || '',
                                last_name: userItem.last_name || '',
                                title: userItem.title || '',
                                email: userItem.email,
                                phone: userItem.phone || '',
                                role: userItem.role,
                                department: userItem.department || ''
                              })
                              setShowAddUser(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteUser(userItem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      {usersSearchQuery ? 'No users found matching your search.' : 'No users found.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-[95vw] max-w-4xl max-h-[90vh] bg-background rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <Button variant="outline" onClick={() => {
                setShowAddUser(false)
                setEditingUser(null)
                setNewUser({
                  first_name: "",
                  last_name: "",
                  title: "",
                  email: "",
                  phone: "",
                  role: "viewer",
                  department: ""
                })
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={editingUser ? handleEditUser : handleAddUser} className="space-y-6">
                <div className="text-sm text-muted-foreground mb-4">
                  <span className="text-red-500">*</span> Required fields
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_first_name">First Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="user_first_name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="user_last_name">Last Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="user_last_name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="user_title">Title</Label>
                    <Input
                      id="user_title"
                      value={newUser.title}
                      onChange={(e) => setNewUser({...newUser, title: e.target.value})}
                      placeholder="Enter job title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="user_email">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="user_email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="Enter email address"
                      required
                      disabled={!!editingUser} // Can't change email when editing
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="user_phone">Phone</Label>
                    <Input
                      id="user_phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="user_role">Role <span className="text-red-500">*</span></Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrator">Administrator</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="user_department">Department</Label>
                    <Select value={newUser.department} onValueChange={(value) => setNewUser({...newUser, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Production">Production</SelectItem>
                        <SelectItem value="Quality">Quality</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Safety">Safety</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Management">Management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex items-center gap-2">
                    {editingUser ? <Edit className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    {editingUser ? 'Update User' : 'Add User'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowAddUser(false)
                    setEditingUser(null)
                    setNewUser({
                      first_name: "",
                      last_name: "",
                      title: "",
                      email: "",
                      phone: "",
                      role: "viewer",
                      department: ""
                    })
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add New Team Member Modal */}
      {showAddTeamMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-[95vw] max-w-4xl max-h-[90vh] bg-background rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">Add New Team Member</h2>
              <Button variant="outline" onClick={() => setShowAddTeamMember(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <form onSubmit={handleAddTeamMember} className="space-y-6">
                <div className="text-sm text-muted-foreground mb-4">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="team_member_full_name">Full Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="team_member_full_name"
                      value={newTeamMember.full_name}
                      onChange={(e) => setNewTeamMember({...newTeamMember, full_name: e.target.value})}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="team_member_email">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="team_member_email"
                      type="email"
                      value={newTeamMember.email}
                      onChange={(e) => setNewTeamMember({...newTeamMember, email: e.target.value})}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="team_member_phone">Phone (Optional)</Label>
                    <Input
                      id="team_member_phone"
                      value={newTeamMember.phone}
                      onChange={(e) => setNewTeamMember({...newTeamMember, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="team_member_role">Role <span className="text-red-500">*</span></Label>
                    <Input
                      id="team_member_role"
                      value={newTeamMember.role}
                      onChange={(e) => setNewTeamMember({...newTeamMember, role: e.target.value})}
                      placeholder="Enter role"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="team_member_department">Department <span className="text-red-500">*</span></Label>
                    <Select value={newTeamMember.department} onValueChange={(value) => setNewTeamMember({...newTeamMember, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Production">Production</SelectItem>
                        <SelectItem value="Quality">Quality</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Safety">Safety</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Management">Management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
 
                  <div className="space-y-2">
                    <Label htmlFor="team_member_position">Position</Label>
                    <Input
                      id="team_member_position"
                      value={newTeamMember.position}
                      onChange={(e) => setNewTeamMember({...newTeamMember, position: e.target.value})}
                      placeholder="Enter position"
                    />
                  </div>
 
                  <div className="space-y-2">
                    <Label htmlFor="team_member_employee_id">Employee ID</Label>
                    <Input
                      id="team_member_employee_id"
                      value={newTeamMember.employee_id}
                      onChange={(e) => setNewTeamMember({...newTeamMember, employee_id: e.target.value})}
                      placeholder="Enter employee ID"
                    />
                  </div>
 
                  <div className="space-y-2">
                    <Label htmlFor="team_member_location">Location</Label>
                    <Input
                      id="team_member_location"
                      value={newTeamMember.location}
                      onChange={(e) => setNewTeamMember({...newTeamMember, location: e.target.value})}
                      placeholder="Enter location"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Add Member
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddTeamMember(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}