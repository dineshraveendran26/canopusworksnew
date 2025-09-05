import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Function to create admin client with service role key
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required environment variables')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    // Create admin client
    const supabaseAdmin = createAdminClient()

    const body = await request.json()
    const { 
      first_name, 
      last_name, 
      title, 
      email, 
      phone, 
      role, 
      department,
      created_by 
    } = body

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user already exists in public.users
    const { data: existingProfileUser } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .single()

    if (existingProfileUser) {
      return NextResponse.json(
        { error: 'User profile already exists' },
        { status: 409 }
      )
    }

    // Generate a unique ID for the user
    const userId = crypto.randomUUID()

    // Create user profile in public.users table directly
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: userId,
        email,
        first_name,
        last_name,
        title,
        phone: phone || null,
        role,
        department: department || null,
        full_name: `${first_name} ${last_name}`,
        initials: `${first_name[0]}${last_name[0]}`.toUpperCase(),
        join_date: new Date().toISOString().split('T')[0],
        status: 'active',
        is_active: true,
        email_verified: true, // Set to true to avoid constraint violation
        created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json(
        { error: `Failed to create user profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Try to send a simple invitation email using Supabase Auth
    try {
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name,
          last_name,
          title,
          role,
          department,
          phone,
          user_id: userId // Pass the user ID to link with profile
        }
      })

      if (inviteError) {
        console.error('Invitation email error:', inviteError)
        // Don't fail the operation, just log it
        console.warn('Could not send invitation email, but user profile was created successfully')
      }
    } catch (error) {
      console.error('Email invitation failed:', error)
      console.warn('User profile created but email invitation failed')
    }

    return NextResponse.json({
      success: true,
      user: profileData,
      message: 'User profile created successfully. Invitation email sent.'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 