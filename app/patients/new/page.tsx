'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPatientPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    insurance_member_id: '',
    notes: ''
  })

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [router, supabase])

  // Real-time duplicate check for phone number
  useEffect(() => {
    const checkDuplicatePhone = async () => {
      if (!formData.phone || formData.phone.trim() === '') {
        setError('')
        return
      }

      setIsCheckingDuplicate(true)
      
      // Check if phone number already exists
      const { data: existingPatient, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .eq('phone', formData.phone.trim())
        .maybeSingle()

      if (error) {
        console.error('Duplicate check error:', error)
        setIsCheckingDuplicate(false)
        return
      }

      if (existingPatient) {
        setError(`⚠️ Phone number ${formData.phone} is already registered to ${existingPatient.first_name} ${existingPatient.last_name}. Please use a different phone number.`)
      } else {
        setError('')
      }
      
      setIsCheckingDuplicate(false)
    }

    const timer = setTimeout(() => {
      if (formData.phone && formData.phone.length >= 10) {
        checkDuplicatePhone()
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [formData.phone, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!formData.first_name || !formData.last_name) {
      setError('First name and last name are required')
      setLoading(false)
      return
    }

    if (!formData.phone) {
      setError('Phone number is required')
      setLoading(false)
      return
    }

    // Final duplicate check before insert
    const { data: existingPatient, error: checkError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, phone')
      .eq('phone', formData.phone.trim())
      .maybeSingle()

    if (checkError) {
      setError('Error checking for duplicates: ' + checkError.message)
      setLoading(false)
      return
    }

    if (existingPatient) {
      setError(`Cannot register: Phone number ${formData.phone} is already registered to ${existingPatient.first_name} ${existingPatient.last_name}.`)
      setLoading(false)
      return
    }

    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    // Get or create clinic
    let clinicId = null
    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('id')
      .maybeSingle()

    if (existingClinic) {
      clinicId = existingClinic.id
    } else {
      const { data: newClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert([{
          name: 'Default Clinic',
          subdomain: 'default',
          email: 'clinic@example.com',
          country: 'LKR'
        }])
        .select()
        .maybeSingle()

      if (newClinic) {
        clinicId = newClinic.id
      } else {
        setError('Unable to create or find clinic: ' + clinicError?.message)
        setLoading(false)
        return
      }
    }

    // Get current user
    const { data: userData } = await supabase
      .from('users')
      .select('clinic_id, id')
      .eq('email', session.user.email)
      .maybeSingle()

    if (userData && !userData.clinic_id) {
      await supabase
        .from('users')
        .update({ clinic_id: clinicId })
        .eq('id', userData.id)
    }

    // Insert patient
    const { data, error: insertError } = await supabase
      .from('patients')
      .insert([{
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        insurance_provider: formData.insurance_provider || null,
        insurance_member_id: formData.insurance_member_id || null,
        notes: formData.notes || null,
        clinic_id: clinicId,
        status: 'active'
      }])
      .select()
      .maybeSingle()

    if (insertError) {
      if (insertError.code === '23505') {
        setError('❌ This phone number is already registered to another patient. Please use a different phone number.')
      } else {
        setError('Registration failed: ' + insertError.message)
      }
    } else if (data) {
      setSuccess(`✓ Patient ${formData.first_name} ${formData.last_name} registered successfully!`)
      setTimeout(() => {
        router.push(`/patients/${data.id}`)
      }, 1500)
    } else {
      setError('Failed to register patient. Please try again.')
    }
    setLoading(false)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🦷</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">➕ Register New Patient</h1>
              <p className="text-sm text-gray-500 mt-1">Enter patient information below</p>
            </div>
            <Link href="/patients" className="text-gray-600 hover:text-gray-800">
              ← Back to Patients
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4 rounded">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Personal Information */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">👤 Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                    error && error.includes('phone') ? 'border-red-500' : ''
                  }`}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="0712345678"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isCheckingDuplicate ? 'Checking availability...' : 'Phone number must be unique'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🚨 Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">💳 Insurance Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.insurance_provider}
                  onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member ID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.insurance_member_id}
                  onChange={(e) => setFormData({...formData, insurance_member_id: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📝 Additional Notes</h2>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Any important notes about the patient..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          {/* Form Actions */}
          <div className="bg-gray-50 px-6 py-4 flex gap-3">
            <button
              type="submit"
              disabled={loading || isCheckingDuplicate || !!error}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Registering...' : isCheckingDuplicate ? 'Checking...' : 'Register Patient'}
            </button>
            <Link
              href="/patients"
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 text-center transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}