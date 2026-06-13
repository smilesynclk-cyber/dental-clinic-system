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
  const [debugInfo, setDebugInfo] = useState<string>('')
  
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
    setDebugInfo('')

    // Step 1: Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setDebugInfo(`Auth error: ${authError.message}`)
      setLoading(false)
      return
    }

    // Wait a moment for session to be established
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Step 2: Get user role and clinic details - SIMPLIFIED APPROACH
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, clinic_id, first_name, last_name')
      .eq('email', email)
      .maybeSingle()

    if (userError || !userData) {
      setError('User account not found. Please contact administrator.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    setDebugInfo(`User: ${userData.email}, Role: ${userData.role}, Clinic ID: ${userData.clinic_id}`)

    // Step 3: Check if clinic exists and is active - SEPARATE QUERY
    if (!userData.clinic_id) {
      setError('Account not configured. Please contact administrator.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    // Get clinic data separately (more reliable)
    const { data: clinicData, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, is_active, is_trial, trial_end_date')
      .eq('id', userData.clinic_id)
      .maybeSingle()

    setDebugInfo(prev => `${prev}\nClinic: ${clinicData?.name}, Active: ${clinicData?.is_active}`)

    const isOwnerOrAdmin = userData.role === 'owner' || userData.role === 'admin'
    const isClinicActive = clinicData ? clinicData.is_active === true : false

    if (!isClinicActive && !isOwnerOrAdmin) {
      setError('Your clinic account has been deactivated. Please contact your administrator.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (!isClinicActive && isOwnerOrAdmin) {
      setWarning('⚠️ This clinic is currently deactivated. You can access the system but other users cannot.')
    }

    // Check trial expiry
    if (clinicData && clinicData.is_trial === true && clinicData.trial_end_date && !isOwnerOrAdmin) {
      const trialEnd = new Date(clinicData.trial_end_date)
      const today = new Date()
      const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 3600 * 24))
      
      if (daysLeft <= 0) {
        setError('Your free trial has expired. Please contact the clinic administrator to upgrade.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      
      if (daysLeft <= 3 && daysLeft > 0) {
        setWarning(`⚠️ Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please contact the clinic administrator to upgrade.`)
      }
    }

    // Redirect based on role
    if (userData.role === 'doctor') {
      router.push('/protected/dashboard/doctor')
    } else if (userData.role === 'owner' || userData.role === 'admin') {
      router.push('/protected/admin')
    } else if (userData.role === 'receptionist') {
      router.push('/protected/dashboard/reception')
    } else {
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
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="Dental Clinic Logo" 
            className="w-20 h-20 object-contain mx-auto mb-4"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <h1 className="text-2xl font-bold text-gray-800">Finest Dental Care</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        {/* Debug Info - Remove after fixing */}
        {debugInfo && (
          <div className="mb-4 p-2 bg-gray-100 border border-gray-300 rounded-lg text-xs font-mono">
            <details>
              <summary className="cursor-pointer text-gray-600">Debug Info (Click to expand)</summary>
              <pre className="mt-2 text-gray-500 whitespace-pre-wrap">{debugInfo}</pre>
            </details>
          </div>
        )}

        {warning && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">{warning}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
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
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>

              {resetError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{resetError}</div>
              )}

              {resetSuccess && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{resetSuccess}</div>
              )}

              <div className="flex gap-3">
                <button type="submit" disabled={resetLoading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                  {resetLoading ? 'Sending...' : 'Send Reset Instructions'}
                </button>
                <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">
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