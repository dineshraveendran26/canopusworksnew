'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface SignupFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  title: string
  department: string
}

const departments = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Support',
  'Operations',
  'Finance',
  'Human Resources',
  'IT',
  'Quality Assurance'
]

const titles = [
  'Software Engineer',
  'Senior Engineer',
  'Designer',
  'Marketing Manager',
  'Sales Representative',
  'Support Specialist',
  'Operations Manager',
  'Financial Analyst',
  'HR Specialist',
  'IT Administrator',
  'QA Engineer',
  'Intern',
  'Consultant'
]

export function EnhancedSignupForm() {
  const { signUp } = useAuth()
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    title: '',
    department: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Partial<SignupFormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.department) {
      newErrors.department = 'Department is required'
    }

    if (!formData.title) {
      newErrors.title = 'Job title is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      // Step 1: Sign up with Supabase Auth
      const { error: authError } = await signUp(formData.email, formData.password, {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          department: formData.department,
          title: formData.title,
          phone: formData.phone
        }
      })

      if (authError) {
        setMessage(authError)
        setIsSuccess(false)
        return
      }

      // Step 2: Create user profile via API route
      const response = await fetch('/api/create-user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          title: formData.title,
          department: formData.department,
          initials: `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase()
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || 'Failed to create user profile')
        setIsSuccess(false)
        return
      }

      // Success! User profile created
      setMessage('Registration complete! Access will be provided once the Administrator approves the request.')
      setIsSuccess(true)
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        title: '',
        department: ''
      })

    } catch (error) {
      setMessage('An unexpected error occurred. Please try again.')
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-xl">Registration Successful!</CardTitle>
          <CardDescription>
            Your account has been created and is pending administrator approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You will receive an email notification once your account is approved. 
              You can then reset your password and log in.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Please provide your details to register for an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-first-name">First Name *</Label>
              <Input
                id="signup-first-name"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className={errors.firstName ? 'border-red-500' : ''}
                autoComplete="given-name"
                required
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-last-name">Last Name *</Label>
              <Input
                id="signup-last-name"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className={errors.lastName ? 'border-red-500' : ''}
                autoComplete="family-name"
                required
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter password"
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm password"
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          {/* Department and Title */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-sm text-red-500">{errors.department}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Select value={formData.title} onValueChange={(value) => handleInputChange('title', value)}>
                <SelectTrigger className={errors.title ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  {titles.map((title) => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <Alert className={isSuccess ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              <AlertDescription className={isSuccess ? 'text-green-700' : 'text-red-700'}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
