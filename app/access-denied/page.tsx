'use client'

import Link from 'next/link'
import { useEffect, Suspense } from 'react'
import { createClient } from '@/lib/client'
import { useSearchParams } from 'next/navigation'

function AccessDeniedContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  useEffect(() => {
    // Auto sign out after 5 seconds
    const timer = setTimeout(async () => {
      await supabase.auth.signOut()
    }, 5000)

    return () => clearTimeout(timer)
  }, [supabase])

  const getMessage = () => {
    switch(reason) {
      case 'clinic_deactivated':
        return {
          title: 'Clinic Deactivated',
          message: 'Your clinic account has been deactivated. Please contact your system administrator to reactivate your account.',
          icon: '🏥'
        }
      case 'subscription_expired':
        return {
          title: 'Subscription Expired',
          message: 'Your clinic subscription has expired. Please contact your administrator to renew your subscription.',
          icon: '⏰'
        }
      default:
        return {
          title: 'Access Denied',
          message: 'Your clinic account has been deactivated or subscription has expired. Please contact your system administrator.',
          icon: '🚫'
        }
    }
  }

  const { title, message, icon } = getMessage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">{icon}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Return to Login
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            You will be automatically logged out in a few seconds...
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccessDeniedContent />
    </Suspense>
  )
} 
