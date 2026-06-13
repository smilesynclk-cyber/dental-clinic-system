'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [warning, setWarning] = useState('')
  
  // Reset password modal states
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setWarning('')

    console.log('Attempting login for:', email)

    // Step 1: Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Auth error:', authError)
      setError(authError.message)
      setLoading(false)
      return
    }

    console.log('Auth success:', authData.user?.id)

    // Wait a moment for session to be established
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Step 2: Get user role and clinic details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        role,
        clinic_id,
        first_name,
        last_name,
        clinics (
          id,
          name,
          is_active,
          is_trial,
          trial_start_date,
          trial_end_date,
          subscription_expires_at,
          subscription_plan
        )
      `)
      .eq('email', email)
      .maybeSingle()

    console.log('User data:', userData)
    console.log('User error:', userError)

    if (userError) {
      console.error('Error fetching user role:', userError)
      setError('Database error: ' + (userError.message || 'Unknown error'))
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (!userData) {
      console.error('No user record found for email:', email)
      setError('User account not found. Please contact administrator.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    // Step 3: Check if clinic exists
    if (!userData.clinic_id) {
      console.error('User has no clinic assigned:', email)
      setError('Account not configured. Please contact administrator.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    // Step 4: Get clinic data - handle array response
    // The `clinics` relation returns an array, so we need to get the first item
    const clinicArray = userData.clinics as any[]
    const clinicData = clinicArray && clinicArray.length > 0 ? clinicArray[0] : null
    
    const isOwnerOrAdmin = userData.role === 'owner' || userData.role === 'admin'
    const isClinicActive = clinicData ? clinicData.is_active !== false : false
    
    if (!isClinicActive && !isOwnerOrAdmin) {
      console.error('Clinic is deactivated:', clinicData?.name)
      setError('Your clinic account has been deactivated. Please contact your administrator.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    // Show warning but allow login for deactivated clinics (owners/admins only)
    if (!isClinicActive && isOwnerOrAdmin) {
      console.warn('Clinic is deactivated but allowing admin/owner login:', clinicData?.name)
      setWarning('⚠️ This clinic is currently deactivated. You can access the system but other users cannot.')
    }

    // Step 5: Check TRIAL status
    let isTrialValid = true
    let trialDaysLeft = null
    let trialMessage = ''
    
    if (clinicData && clinicData.is_trial === true) {
      const trialEnd = clinicData.trial_end_date ? new Date(clinicData.trial_end_date) : null
      const today = new Date()
      
      if (trialEnd) {
        trialDaysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 3600 * 24))
        isTrialValid = trialDaysLeft > 0
        
        if (!isTrialValid && !isOwnerOrAdmin) {
          console.error('Trial expired:', clinicData.trial_end_date)
          setError('Your free trial has expired. Please contact the clinic administrator to upgrade your subscription.')
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        
        // Show warning for expiring trial (non-admin users)
        if (isTrialValid && trialDaysLeft <= 3 && trialDaysLeft > 0 && !isOwnerOrAdmin) {
          trialMessage = `⚠️ Your free trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}. Please contact the clinic administrator to upgrade.`
          setWarning(trialMessage)
          console.log('Trial expiring soon:', trialDaysLeft, 'days left')
        }
        
        // Show info for trial users (admin)
        if (isTrialValid && isOwnerOrAdmin) {
          console.log('Clinic is on trial:', trialDaysLeft, 'days remaining')
        }
      }
    }

    // Step 6: Check subscription - Allow owners/admins even if expired
    let isSubscriptionValid = true
    let daysLeft = null
    
    if (clinicData && clinicData.subscription_expires_at && !clinicData.is_trial) {
      const expiryDate = new Date(clinicData.subscription_expires_at)
      const today = new Date()
      isSubscriptionValid = expiryDate >= today
      daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
      
      if (!isSubscriptionValid && !isOwnerOrAdmin) {
        console.error('Subscription expired:', clinicData.subscription_expires_at)
        setError('Your clinic subscription has expired. Please contact administrator to renew.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      
      // Show warning for expiring subscription
      if (isSubscriptionValid && daysLeft <= 7 && daysLeft > 0 && !isOwnerOrAdmin) {
        const subWarning = `⚠️ Your subscription ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please contact the clinic administrator.`
        setWarning(subWarning)
        console.log('Subscription expiring soon:', daysLeft, 'days left')
      }
    }

    console.log('User role:', userData.role)
    console.log('Clinic status:', clinicData?.is_active ? 'Active' : 'Inactive')
    console.log('Is Trial:', clinicData?.is_trial || false)
    if (trialDaysLeft) console.log('Trial days left:', trialDaysLeft)
    console.log('Subscription valid:', isSubscriptionValid)
    if (daysLeft) console.log('Subscription days left:', daysLeft)

    // Step 7: Redirect based on role
    if (userData.role === 'doctor') {
      console.log('Redirecting to doctor dashboard')
      router.push('/protected/dashboard/doctor')
    } else if (userData.role === 'owner' || userData.role === 'admin') {
      console.log('Redirecting to admin panel')
      router.push('/protected/admin')
    } else if (userData.role === 'receptionist') {
      console.log('Redirecting to reception dashboard')
      router.push('/protected/dashboard/reception')
    } else {
      console.log('Redirecting to default dashboard')
      router.push('/dashboard')
    }
    
    setLoading(false)
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetSuccess('')

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setResetError(error.message)
    } else {
      setResetSuccess('Password reset instructions sent to your email!')
      setTimeout(() => {
        setShowResetModal(false)
        setResetEmail('')
        setResetSuccess('')
      }, 3000)
    }
    setResetLoading(false)
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-4xl">🦷</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
            <p className="text-gray-500 mt-2">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Dental Clinic Logo" 
              className="w-16 h-16 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const parent = e.currentTarget.parentElement
                if (parent) {
                  const span = document.createElement('span')
                  span.className = 'text-4xl'
                  span.textContent = '🦷'
                  parent.appendChild(span)
                }
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Finest Dental Care</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        {/* Warning Banner */}
        {warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">{warning}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo Accounts Info - Commented out for production */}
        {/*
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600 mb-3">Demo Accounts</p>
          <div className="space-y-2 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-800">👨‍⚕️ Doctor</p>
              <p className="text-gray-500 text-xs">doctor@demo.com / doctor123</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-800">💼 Receptionist</p>
              <p className="text-gray-500 text-xs">reception@demo.com / reception123</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 bg-purple-50">
              <p className="font-medium text-purple-800">👑 Owner/Admin</p>
              <p className="text-gray-500 text-xs">owner@demo.com / owner123</p>
              <p className="text-xs text-purple-600 mt-1">✓ Can login even when trial expired</p>
            </div>
          </div>
        </div>
        */}
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔐</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
              <p className="text-gray-500 mt-2">Enter your email to receive reset instructions</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>

              {resetError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
                  {resetSuccess}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Instructions'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false)
                    setResetError('')
                    setResetSuccess('')
                    setResetEmail('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}