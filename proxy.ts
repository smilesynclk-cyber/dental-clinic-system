import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // If no session and trying to access protected route, redirect to login
  if (!session) {
    const isProtectedRoute = req.nextUrl.pathname.startsWith('/protected') ||
                            req.nextUrl.pathname.startsWith('/dashboard') ||
                            req.nextUrl.pathname.startsWith('/patients') ||
                            req.nextUrl.pathname.startsWith('/appointments')
    
    if (isProtectedRoute) {
      const redirectUrl = new URL('/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/protected/:path*',
    '/dashboard/:path*',
    '/patients/:path*',
    '/appointments/:path*'
  ]
}