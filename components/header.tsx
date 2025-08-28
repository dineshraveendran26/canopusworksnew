"use client"

import { useState } from "react"
import { AddTaskButton } from "./add-task-button"
import { UserProfileDropdown } from "./user-profile-dropdown"

export function Header() {
  const [showTaskModal, setShowTaskModal] = useState(false)

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Canopus Works
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Task Management System</p>
            </div>
          </div>

          {/* Right side - Add Task Button and User Profile */}
          <div className="flex items-center space-x-4">
            <AddTaskButton />
            <UserProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}
