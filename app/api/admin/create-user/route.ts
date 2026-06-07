import { supabaseAdmin } from '@/lib/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, role, clinicId } = body

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify admin
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('email', authUser.email)
      .single()

    if (currentUser?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // First, check if user already exists in public.users
    const { data: existingPublicUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingPublicUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Check if user exists in auth
    let userId = null
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
    const foundUser = existingAuthUser?.users.find((u: any) => u.email === email)

    if (foundUser) {
      userId = foundUser.id
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName, role }
      })

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
      userId = authData.user.id
    }

    // Insert into public.users - use a fresh ID if needed
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        clinic_id: clinicId || null,
        is_active: true
      })

    if (dbError) {
      // If duplicate key, try with a new UUID
      if (dbError.code === '23505') {
        const newId = crypto.randomUUID()
        const { error: retryError } = await supabaseAdmin
          .from('users')
          .insert({
            id: newId,
            email,
            first_name: firstName,
            last_name: lastName,
            role,
            clinic_id: clinicId || null,
            is_active: true
          })
        
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'User added with new ID' })
      }
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}