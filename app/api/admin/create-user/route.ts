import { supabaseAdmin } from '@/lib/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, role, clinicId } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the requesting user is an admin using regular client
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (owner)
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('email', authUser.email)
      .single()

    if (currentUser?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // STEP 1: Create auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData?.user) {
      return NextResponse.json({ error: 'Failed to create user in auth system' }, { status: 400 })
    }

    // STEP 2: Add to public users table
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
        clinic_id: clinicId || null,
        is_active: true
      })

    if (dbError) {
      // Rollback - delete the auth user if db insert fails
      console.error('DB error, rolling back...', dbError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}