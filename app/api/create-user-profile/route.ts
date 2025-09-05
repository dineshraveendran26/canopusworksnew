import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, title, department, initials } = body

    console.log('API Route - Received data:', { firstName, lastName, email, phone, title, department, initials })

    // Validate required fields
    if (!firstName || !lastName || !email || !title || !department) {
      console.log('API Route - Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the current user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('API Route - Authentication error:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('API Route - User authenticated:', user.id)

    // Check if user profile already exists (created by trigger)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.log('API Route - Error checking existing user:', checkError)
      return NextResponse.json(
        { error: 'Failed to check user status' },
        { status: 500 }
      )
    }

    if (existingUser) {
      console.log('API Route - User profile already exists:', existingUser)
      // User profile already exists (created by trigger), just return success
      return NextResponse.json(
        { 
          success: true, 
          message: 'User profile already exists',
          userId: existingUser.id,
          isActive: existingUser.is_active
        },
        { status: 200 }
      )
    }

    const fullName = `${firstName} ${lastName}`

    console.log('API Route - Creating user profile with data:', {
      user_id: user.id,
      user_email: email,
      user_full_name: fullName,
      user_initials: initials,
      user_role: 'viewer',
      user_department: department,
      user_phone: phone || null,
      user_location: null,
      user_join_date: new Date().toISOString().split('T')[0],
      user_status: 'active',
      user_avatar_url: null
    })

    // Create user profile using the database function
    const { data, error } = await supabase.rpc('create_user_profile', {
      user_id: user.id,
      user_email: email,
      user_full_name: fullName,
      user_initials: initials,
      user_role: 'viewer', // Default role for new users
      user_department: department,
      user_phone: phone || null,
      user_location: null,
      user_join_date: new Date().toISOString().split('T')[0],
      user_status: 'active',
      user_avatar_url: null
    })

    if (error) {
      console.error('API Route - Error creating user profile:', error)
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + error.message },
        { status: 500 }
      )
    }

    console.log('API Route - User profile created successfully:', data)

    return NextResponse.json(
      { 
        success: true, 
        message: 'User profile created successfully',
        userId: user.id 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('API Route - Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
