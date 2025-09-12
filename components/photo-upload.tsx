"use client"

import { useState, useRef } from "react"
import { Camera, X } from "lucide-react"

interface PhotoUploadProps {
  currentPhotoUrl?: string
  onPhotoChange: (photoUrl: string) => void
  size?: "sm" | "md" | "lg"
}

export function PhotoUpload({ currentPhotoUrl, onPhotoChange, size = "md" }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-20 w-20"
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setIsUploading(true)

    // Create a preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      onPhotoChange(result)
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    onPhotoChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="relative group">
      {/* Photo Display */}
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 relative`}>
        {currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-semibold">
            {size === "sm" ? "DR" : size === "md" ? "DR" : "DR"}
          </div>
        )}

        {/* Upload Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="h-6 w-6 text-white" />
        </div>

        {/* Remove Photo Button */}
        {currentPhotoUrl && (
          <button
            onClick={handleRemovePhoto}
            className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUploadClick}
        disabled={isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        title="Upload photo"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </button>

      {/* Loading State */}
      {isUploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  )
} 