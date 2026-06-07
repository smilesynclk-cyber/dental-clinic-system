'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/client'
import CurrencySwitcher from './CurrencySwitcher'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, role')
          .eq('email', session.user.email)
          .single()
        setUserName(`${userData?.first_name || ''} ${userData?.last_name || ''}`)
        setUserRole(userData?.role || '')
      }
    }
    getUser()
  }, [])

  const isLoginPage = pathname === '/login'
  
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Dental Clinic Logo" 
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <span className="font-semibold text-gray-800">Finest Dental Care</span>
            </div>
            
            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* User Info */}
              {userName && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{userName}</p>
                  <p className="text-xs text-gray-400 capitalize">{userRole}</p>
                </div>
              )}
              
              {/* Currency Switcher */}
              <CurrencySwitcher />
              
              {/* Admin Button */}
              {userRole === 'owner' && (
  <>
    <Link href="/protected/admin" className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg">
      👑 Admin Panel
    </Link>
    <Link href="/protected/admin/monitoring" className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg">
      📊 Monitoring
    </Link>
  </>
)}
              
              {/* Logout Button */}
              <form action="/api/auth/logout" method="post">
                <button className="text-sm text-gray-500 hover:text-red-600 transition">
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}