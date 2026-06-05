'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewAppointmentPage() {
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [patients, setPatients] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [showPatientSearch, setShowPatientSearch] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration_minutes: 30,
    type: 'Checkup',
    status: 'scheduled',
    notes: '',
    room_number: ''
  })

  const router = useRouter()
  const supabase = createClient()

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

  // Search patients
  useEffect(() => {
    if (searchTerm.length > 2 && !checkingAuth) {
      searchPatients()
    }
  }, [searchTerm, checkingAuth])

  async function searchPatients() {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(10)
    
    if (data) setPatients(data)
  }

  async function sendEmailConfirmation(appointmentId: string, patient: any, appointmentData: any) {
    try {
      const response = await fetch('/api/send-appointment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointmentId,
          patientEmail: patient.email,
          patientName: `${patient.first_name} ${patient.last_name}`,
          appointmentData: {
            date: appointmentData.date,
            time: appointmentData.time,
            type: appointmentData.type,
            duration_minutes: appointmentData.duration_minutes,
            room_number: appointmentData.room_number,
            notes: appointmentData.notes,
            doctor_name: 'Dental Team',
            clinic_name: 'Dental Clinic',
            clinic_phone: '+1 234 567 8900',
            clinic_email: 'info@dentalclinic.com',
            clinic_address: '123 Dental Street, Health City'
          }
        })
      })
      
      const result = await response.json()
      if (result.success) {
        console.log('Confirmation email sent:', result.message)
      } else {
        console.error('Failed to send email:', result.error)
      }
    } catch (emailError) {
      console.error('Email error:', emailError)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Verify session again before submitting
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('Session expired. Please login again.')
      router.push('/login')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([formData])
      .select()

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
    } else {
      // Send email confirmation if patient has email
      if (selectedPatient?.email && data && data[0]) {
        setSendingEmail(true)
        await sendEmailConfirmation(data[0].id, selectedPatient, formData)
        setSendingEmail(false)
      }
      
      // Show success message
      const emailStatus = selectedPatient?.email ? 'Confirmation email sent.' : 'No email on file to send confirmation.'
      alert(`✓ Appointment scheduled successfully!\n${emailStatus}`)
      
      router.push('/appointments')
      router.refresh()
    }
    setLoading(false)
  }

  function selectPatient(patient: any) {
    setSelectedPatient(patient)
    setFormData({ ...formData, patient_id: patient.id })
    setShowPatientSearch(false)
  }

  // Show loading while checking auth
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
              <h1 className="text-2xl font-bold text-blue-600">📅 Schedule Appointment</h1>
              <p className="text-sm text-gray-500 mt-1">Book a new appointment for a patient</p>
            </div>
            <Link href="/appointments" className="text-gray-600 hover:text-gray-800">
              ← Back to Appointments
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient *
              </label>
              
              {showPatientSearch ? (
                <div>
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {patients.length > 0 && (
                    <div className="mt-2 border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {patients.map((patient) => (
                        <div
                          key={patient.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition"
                          onClick={() => selectPatient(patient)}
                        >
                          <div className="font-medium">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            📞 {patient.phone || 'No phone'}
                            {patient.email && ` | ✉️ ${patient.email}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchTerm.length > 2 && patients.length === 0 && (
                    <div className="mt-2 p-3 text-center text-gray-500 border rounded-lg">
                      No patients found. 
                      <Link href="/patients/new" className="text-blue-600 ml-1">
                        Register new patient?
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {selectedPatient?.first_name} {selectedPatient?.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      📞 {selectedPatient?.phone || 'No phone'}
                      {selectedPatient?.email && ` | ✉️ ${selectedPatient.email}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPatientSearch(true)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Change Patient
                  </button>
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            {/* Appointment Type and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Type
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Checkup">🩺 Checkup</option>
                  <option value="Cleaning">🪥 Cleaning</option>
                  <option value="Filling">🦷 Filling</option>
                  <option value="Extraction">🦷 Extraction</option>
                  <option value="Root Canal">🦷 Root Canal</option>
                  <option value="Crown">👑 Crown</option>
                  <option value="Consultation">💬 Consultation</option>
                  <option value="Emergency">🚨 Emergency</option>
                  <option value="Follow-up">📋 Follow-up</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                >
                  <option value="15">15 min - Quick Check</option>
                  <option value="30">30 min - Standard</option>
                  <option value="45">45 min - Extended</option>
                  <option value="60">60 min - Complex</option>
                  <option value="90">90 min - Surgery</option>
                </select>
              </div>
            </div>

            {/* Room Number and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number
                </label>
                <input
                  type="text"
                  placeholder="e.g., Room 101"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="scheduled">📅 Scheduled</option>
                  <option value="confirmed">✅ Confirmed</option>
                  <option value="completed">✔️ Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Any special notes about this appointment..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Info Box */}
            {selectedPatient && !selectedPatient.email && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                ⚠️ This patient has no email address. Confirmation email will not be sent.
              </div>
            )}

            {selectedPatient && selectedPatient.email && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                ✅ Confirmation email will be sent to: {selectedPatient.email}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || !formData.patient_id}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scheduling...
                  </span>
                ) : (
                  '📅 Schedule Appointment'
                )}
              </button>
              <Link
                href="/appointments"
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-center hover:bg-gray-300 transition"
              >
                Cancel
              </Link>
            </div>

            {/* Email sending indicator */}
            {sendingEmail && (
              <div className="text-center text-sm text-gray-500">
                Sending confirmation email...
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}