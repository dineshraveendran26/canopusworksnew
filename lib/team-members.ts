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
  status: "active" | "inactive" | "on_leave" | "terminated"
  location?: string
  supervisor_id?: string
  avatar_url?: string
  skills?: string[]
  certifications?: string[]
  created_at: string
  updated_at: string
  user_id?: string
}

// Local team members data removed - now using real database data
