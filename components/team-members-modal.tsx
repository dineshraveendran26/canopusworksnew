"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTeamMembers } from "@/hooks/use-team-members"
import { Search, X } from "lucide-react"

interface TeamMembersModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TeamMembersModal({ isOpen, onClose }: TeamMembersModalProps) {
  const {
    teamMembers,
    loading,
    error,
    fetchTeamMembers,
  } = useTeamMembers()

  const [searchQuery, setSearchQuery] = useState("")

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

  // Filter team members based on search query
  const filteredMembers = teamMembers.filter(member => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      member.full_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      member.department.toLowerCase().includes(query) ||
      (member.phone && member.phone.toLowerCase().includes(query)) ||
      (member.location && member.location.toLowerCase().includes(query))
    )
  })

  const clearSearch = () => {
    setSearchQuery("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden mx-4">
        <DialogHeader>
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
              </div>
            </div>
          </div>
        </DialogHeader>

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
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
                {filteredMembers.map((member) => (
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
      </DialogContent>
    </Dialog>
  )
}
