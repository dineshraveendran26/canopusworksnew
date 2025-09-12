import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId, role, approvedBy, userEmail, userName } = await request.json()

    if (!userId || !role || !approvedBy) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key (server-side only)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🚀 Approving user via API route:', {
      userId,
      role,
      email: userEmail
    })

    // Call the Edge Function for user approval with email notification
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-user-with-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approvalData: {
          userId: userId,
          newRole: role,
          approvedBy: approvedBy
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to approve user')
    }

    const result = await response.json()
    console.log('✅ User approval result:', result)

    return NextResponse.json({
      success: true,
      message: 'User approved successfully and email sent',
      result
    })

  } catch (error) {
    console.error('Error in approve-user API route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
