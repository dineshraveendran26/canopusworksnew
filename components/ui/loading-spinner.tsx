import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  color?: "default" | "white" | "primary"
}

export function LoadingSpinner({ 
  size = "md", 
  className,
  color = "default" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-6 w-6"
  }

  const colorClasses = {
    default: "border-current border-t-transparent",
    white: "border-white border-t-transparent",
    primary: "border-primary border-t-transparent"
  }

  return (
    <div 
      className={cn(
        "animate-spin rounded-full border-2",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  )
}
