import { supabaseAdmin } from '@/lib/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    // Verify the requesting user is an admin
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('email', authUser.email)
      .single()

    if (currentUser?.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get the user ID from auth
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
    const userToDelete = userList?.users.find((u: any) => u.email === email)

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found in auth' }, { status: 404 })
    }

    // Delete from auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}