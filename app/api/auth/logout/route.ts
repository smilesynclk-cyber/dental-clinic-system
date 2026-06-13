import { createClient } from '@/lib/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Get the origin from the request URL
  const url = new URL(request.url)
  const origin = url.origin
  
  return NextResponse.redirect(new URL('/login', origin))
}