'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SystemMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [clinics, setClinics] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [systemHealth, setSystemHealth] = useState({
    databaseSize: '0 MB',
    totalUsers: 0,
    totalPatients: 0,
    totalAppointments: 0,
    activeSessions: 0,
    lastBackup: null as string | null
  })
  const [showExtendModal, setShowExtendModal] = useState<any>(null)
  const [showTrialModal, setShowTrialModal] = useState<any>(null)
  const [extendDays, setExtendDays] = useState(30)
  const [trialDays, setTrialDays] = useState(7)
  const [systemSettings, setSystemSettings] = useState({
    maintenance_mode: false,
    allow_new_registrations: true,
    system_message: ''
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  async function checkAdminAndLoadData() {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (currentUser?.role !== 'owner') {
      router.push('/protected/dashboard/reception')
      return
    }

    await loadData()
  }

  async function loadData() {
    setLoading(true)
    
    try {
      const { data: clinicsData } = await supabase
        .from('clinics')
        .select('*')
        .order('name')

      setClinics(clinicsData || [])

      const subscriptionsData = (clinicsData || []).map((clinic: any) => {
        const expiresAt = clinic.subscription_expires_at ? new Date(clinic.subscription_expires_at) : null
        const today = new Date()
        let status = 'active'
        let daysLeft = null
        
        if (clinic.is_trial && clinic.trial_end_date) {
          const trialEnd = new Date(clinic.trial_end_date)
          daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 3600 * 24))
          if (daysLeft < 0) {
            status = 'trial_expired'
          } else if (daysLeft <= 3) {
            status = 'trial_expiring_soon'
          } else {
            status = 'trial_active'
          }
        } else if (expiresAt) {
          daysLeft = Math.ceil((expiresAt.getTime() - today.getTime()) / (1000 * 3600 * 24))
          if (daysLeft < 0) {
            status = 'expired'
          } else if (daysLeft <= 7) {
            status = 'expiring_soon'
          }
        } else {
          status = 'no_subscription'
        }
        
        return {
          ...clinic,
          subscription_status: status,
          days_left: daysLeft
        }
      })
      
      setSubscriptions(subscriptionsData)

      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })

      const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })

      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .single()

      setSystemSettings({
        maintenance_mode: settings?.maintenance_mode || false,
        allow_new_registrations: settings?.allow_new_registrations !== false,
        system_message: settings?.system_message || ''
      })

      setSystemHealth({
        databaseSize: await getDatabaseSize(),
        totalUsers: userCount || 0,
        totalPatients: patientCount || 0,
        totalAppointments: appointmentCount || 0,
        activeSessions: 0,
        lastBackup: null
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function getDatabaseSize() {
    try {
      const { data } = await supabase.rpc('get_database_size')
      return data || '0 MB'
    } catch {
      return 'N/A'
    }
  }

  async function activateTrial(clinicId: string, clinicName: string, days: number) {
    if (!confirm(`Activate ${days}-day trial for ${clinicName}?`)) return

    setLoading(true)
    try {
      const trialStartDate = new Date()
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + days)

      const { error } = await supabase
        .from('clinics')
        .update({
          is_trial: true,
          trial_start_date: trialStartDate.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          subscription_plan: 'trial',
          is_active: true,
          subscription_expires_at: null
        })
        .eq('id', clinicId)

      if (error) throw error

      alert(`✓ ${days}-day trial activated for ${clinicName}!`)
      setShowTrialModal(null)
      await loadData()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function activateFinestDentalTrial() {
    const clinic = subscriptions.find(c => c.name === 'Finest Dental Care')
    if (!clinic) {
      alert('Finest Dental Care clinic not found!')
      return
    }
    await activateTrial(clinic.id, clinic.name, 7)
  }

  async function convertToPaid(clinicId: string, clinicName: string) {
    if (!confirm(`Convert ${clinicName} to paid subscription?`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          is_trial: false,
          trial_start_date: null,
          trial_end_date: null,
          subscription_plan: 'basic',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', clinicId)

      if (error) throw error

      alert(`✓ ${clinicName} converted to paid subscription!`)
      await loadData()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleClinicStatus(clinicId: string, currentStatus: boolean, clinicName: string) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} ${clinicName}?`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ is_active: !currentStatus })
        .eq('id', clinicId)

      if (error) throw error

      alert(`✓ ${clinicName} ${currentStatus ? 'deactivated' : 'activated'}!`)
      await loadData()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function extendSubscription(clinicId: string, days: number) {
    setLoading(true)
    try {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('subscription_expires_at')
        .eq('id', clinicId)
        .single()

      const currentExpiry = clinic?.subscription_expires_at ? new Date(clinic.subscription_expires_at) : new Date()
      const newExpiry = new Date(currentExpiry)
      newExpiry.setDate(newExpiry.getDate() + days)

      const { error } = await supabase
        .from('clinics')
        .update({ subscription_expires_at: newExpiry.toISOString() })
        .eq('id', clinicId)

      if (error) throw error

      alert(`✓ Subscription extended by ${days} days!`)
      setShowExtendModal(null)
      await loadData()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateSystemSettings() {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          maintenance_mode: systemSettings.maintenance_mode,
          allow_new_registrations: systemSettings.allow_new_registrations,
          system_message: systemSettings.system_message,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      alert('✓ System settings updated!')
      await loadData()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      expiring_soon: { color: 'bg-yellow-100 text-yellow-800', text: 'Expiring Soon' },
      expired: { color: 'bg-red-100 text-red-800', text: 'Expired' },
      trial_active: { color: 'bg-blue-100 text-blue-800', text: 'Trial Active' },
      trial_expiring_soon: { color: 'bg-orange-100 text-orange-800', text: 'Trial Expiring Soon' },
      trial_expired: { color: 'bg-red-100 text-red-800', text: 'Trial Expired' },
      no_subscription: { color: 'bg-gray-100 text-gray-800', text: 'No Plan' }
    }
    return badges[status] || badges.no_subscription
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">📊 System Monitoring</h1>
              <p className="text-gray-500">Monitor system health, clinics, and subscriptions</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={activateFinestDentalTrial}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-base font-bold transition flex items-center gap-2 shadow-lg"
              >
                <span className="text-xl">🎉</span>
                Activate 7-Day Trial (Finest Dental)
              </button>
              <Link href="/protected/admin" className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition">
                ← Back
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Database Size</p>
                <p className="text-2xl font-bold">{systemHealth.databaseSize}</p>
              </div>
              <div className="text-2xl">💾</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{systemHealth.totalUsers}</p>
              </div>
              <div className="text-2xl">👥</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Patients</p>
                <p className="text-2xl font-bold">{systemHealth.totalPatients}</p>
              </div>
              <div className="text-2xl">🩺</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Appointments</p>
                <p className="text-2xl font-bold">{systemHealth.totalAppointments}</p>
              </div>
              <div className="text-2xl">📅</div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800">⚙️ System Controls</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-3 mb-4">
                  <input type="checkbox" checked={systemSettings.maintenance_mode} onChange={(e) => setSystemSettings({...systemSettings, maintenance_mode: e.target.checked})} className="h-4 w-4 text-red-600 rounded" />
                  <span className="text-sm font-medium">Maintenance Mode</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" checked={systemSettings.allow_new_registrations} onChange={(e) => setSystemSettings({...systemSettings, allow_new_registrations: e.target.checked})} className="h-4 w-4 text-green-600 rounded" />
                  <span className="text-sm font-medium">Allow New Registrations</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">System Message</label>
                <textarea rows={3} className="w-full px-3 py-2 border rounded-lg" value={systemSettings.system_message} onChange={(e) => setSystemSettings({...systemSettings, system_message: e.target.value})} />
              </div>
            </div>
            <button onClick={updateSystemSettings} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save Settings</button>
          </div>
        </div>

        {/* Clinics Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800">🏥 Clinics Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Clinic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">System</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map((clinic) => {
                  const statusBadge = getStatusBadge(clinic.subscription_status)
                  const isTrial = clinic.is_trial
                  
                  return (
                    <tr key={clinic.id} className={isTrial ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{clinic.name}</div>
                        <div className="text-xs text-gray-500">ID: {clinic.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isTrial && clinic.trial_end_date ? (
                          <div>
                            Trial ends: {new Date(clinic.trial_end_date).toLocaleDateString()}
                            {clinic.days_left !== null && clinic.days_left > 0 && (
                              <div className="text-xs text-blue-600">{clinic.days_left} days left</div>
                            )}
                          </div>
                        ) : clinic.subscription_expires_at ? (
                          <div>
                            Expires: {new Date(clinic.subscription_expires_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-400">No active plan</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${clinic.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {clinic.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {!clinic.is_trial && !clinic.subscription_expires_at && (
                            <button onClick={() => setShowTrialModal(clinic)} className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700">
                              🎉 Start Trial
                            </button>
                          )}
                          {clinic.is_trial && clinic.days_left > 0 && (
                            <button onClick={() => convertToPaid(clinic.id, clinic.name)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">
                              Convert to Paid
                            </button>
                          )}
                          {!clinic.is_trial && clinic.subscription_expires_at && (
                            <button onClick={() => setShowExtendModal(clinic)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                              Extend
                            </button>
                          )}
                          <button onClick={() => toggleClinicStatus(clinic.id, clinic.is_active, clinic.name)} className={`px-3 py-1 rounded text-xs ${clinic.is_active ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                            {clinic.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trial Modal */}
        {showTrialModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Activate Free Trial</h2>
              <p className="mb-4">Activate trial for <strong>{showTrialModal.name}</strong></p>
              <select className="w-full px-3 py-2 border rounded-lg mb-4" value={trialDays} onChange={(e) => setTrialDays(parseInt(e.target.value))}>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => activateTrial(showTrialModal.id, showTrialModal.name, trialDays)} className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg">Activate</button>
                <button onClick={() => setShowTrialModal(null)} className="flex-1 bg-gray-300 px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Extend Modal */}
        {showExtendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Extend Subscription</h2>
              <p className="mb-4">Extend for <strong>{showExtendModal.name}</strong></p>
              <select className="w-full px-3 py-2 border rounded-lg mb-4" value={extendDays} onChange={(e) => setExtendDays(parseInt(e.target.value))}>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => extendSubscription(showExtendModal.id, extendDays)} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg">Extend</button>
                <button onClick={() => setShowExtendModal(null)} className="flex-1 bg-gray-300 px-4 py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}