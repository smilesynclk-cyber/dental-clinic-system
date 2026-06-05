'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'

export default function SubscriptionExpiredPage() {
  const [clinicName, setClinicName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkSubscription()
  }, [])

  async function checkSubscription() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role, clinic_id')
      .eq('email', session.user.email)
      .single()

    setUserRole(userData?.role || '')

    // If admin, allow access to admin panel
    if (userData?.role === 'owner') {
      router.push('/protected/admin')
      return
    }

    // Get clinic subscription info for non-admin users
    if (userData?.clinic_id) {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name, subscription_expires_at, is_active')
        .eq('id', userData.clinic_id)
        .single()

      setClinicName(clinic?.name || 'Your Clinic')
      setExpiryDate(clinic?.subscription_expires_at 
        ? new Date(clinic.subscription_expires_at).toLocaleDateString() 
        : 'Unknown')
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">⚠️</span>
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Subscription Expired</h1>
        <p className="text-gray-500 mb-6">
          Your subscription for <span className="font-semibold">{clinicName}</span> has expired.
        </p>

        {/* Details Box */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-600">
            <strong>Expiry Date:</strong> {expiryDate}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Status:</strong> <span className="text-red-600">Inactive</span>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Impact:</strong> System access is disabled until subscription is renewed.
          </p>
        </div>

        {/* Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            📢 Please contact your clinic administrator to renew your subscription.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Logout
          </button>
          <button
            onClick={() => window.location.href = 'mailto:support@finestdentalcare.lk'}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Contact Support
          </button>
        </div>

        {/* Admin Note */}
        <p className="text-xs text-gray-400 mt-6">
          Admin users can still access the system to manage subscriptions.
        </p>
      </div>
    </div>
  )
}