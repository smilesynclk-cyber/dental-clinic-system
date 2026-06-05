import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  
  // First, check if there's a valid session
  const { data: { session } } = await supabase.auth.getSession()
  
  // If no session, go to login immediately
  if (!session) {
    redirect('/login')
  }

  // If session exists, get user and role
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('email', user.email)
    .maybeSingle() // Use maybeSingle to avoid errors
  
  // Admin (owner) goes to Admin Panel
  if (userData?.role === 'owner') {
    redirect('/protected/admin')
  }
  // Doctor goes to Doctor Dashboard
  else if (userData?.role === 'doctor') {
    redirect('/protected/dashboard/doctor')
  }
  // Everyone else goes to Reception Dashboard
  else {
    redirect('/protected/dashboard/reception')
  }
}