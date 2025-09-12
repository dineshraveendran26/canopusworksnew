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

    // Check if user profile already exists
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

    // Call the Edge Function to handle user profile creation
    const { data: edgeFunctionData, error: edgeFunctionError } = await supabase.functions.invoke('handle-user-signup', {
      body: {
        userData: {
          id: user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          department: department,
          email_confirmed_at: user.email_confirmed_at
        }
      }
    })

    if (edgeFunctionError) {
      console.error('API Route - Edge function error:', edgeFunctionError)
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + edgeFunctionError.message },
        { status: 500 }
      )
    }

    console.log('API Route - User profile created successfully via Edge Function:', edgeFunctionData)

    return NextResponse.json(
      { 
        success: true, 
        message: 'User profile created successfully',
        userId: user.id,
        isActive: false // New users need admin approval
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
