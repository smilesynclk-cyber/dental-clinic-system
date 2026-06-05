'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import UserManagement from '@/components/UserManagement'
import SystemSettings from '@/components/SystemSettings'

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  async function checkAdminAndLoadData() {
    setLoading(true)
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    // Check if user is admin (owner)
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (currentUser?.role !== 'owner') {
      router.push('/protected/dashboard/reception')
      return
    }

    setIsAdmin(true)

    // Get all users
    const { data: usersData } = await supabase
      .from('users')
      .select('*, clinics(name)')
      .order('created_at', { ascending: false })

    setUsers(usersData || [])

    // Get system settings
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    setSettings(settingsData || {})

    // Get subscription info
    const { data: subsData } = await supabase
      .from('clinics')
      .select('name, subscription_plan, subscription_expires_at, is_active')

    setSubscriptions(subsData || [])
    setLoading(false)
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

  if (!isAdmin) {
    return null
  }

  const totalUsers = users.length
  const activeClinics = subscriptions.filter((c: any) => c.is_active === true).length
  const expiringSoon = subscriptions.filter((c: any) => {
    if (!c.subscription_expires_at) return false
    const daysLeft = Math.ceil((new Date(c.subscription_expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    return daysLeft <= 7 && daysLeft > 0
  }).length
  const expired = subscriptions.filter((c: any) => c.is_active === false).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-gray-500">System Administration Dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Active Clinics</p>
            <p className="text-2xl font-bold">{activeClinics}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Expiring Soon</p>
            <p className="text-2xl font-bold text-yellow-600">{expiringSoon}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Expired</p>
            <p className="text-2xl font-bold text-red-600">{expired}</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Management */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">👥 User Management</h2>
            </div>
            <UserManagement initialUsers={users} />
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">⚙️ System Settings</h2>
            </div>
            <SystemSettings initialSettings={settings} />
          </div>
        </div>

        {/* Subscription Overview */}
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800">📋 Subscription Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clinic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map((clinic: any) => {
                  const daysLeft = clinic.subscription_expires_at 
                    ? Math.ceil((new Date(clinic.subscription_expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                    : null
                  const isExpiring = daysLeft !== null && daysLeft <= 7 && daysLeft > 0
                  
                  return (
                    <tr key={clinic.name}>
                      <td className="px-4 py-3 text-sm">{clinic.name}</td>
                      <td className="px-4 py-3 text-sm capitalize">{clinic.subscription_plan || 'Free'}</td>
                      <td className="px-4 py-3 text-sm">
                        {clinic.subscription_expires_at 
                          ? new Date(clinic.subscription_expires_at).toLocaleDateString()
                          : 'N/A'}
                        {daysLeft !== null && daysLeft > 0 && (
                          <span className={`text-xs ml-2 ${isExpiring ? 'text-yellow-600' : 'text-gray-400'}`}>
                            ({daysLeft} days left)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          clinic.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {clinic.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={async () => {
                            const supabaseClient = (await import('@/lib/client')).createClient()
                            if (confirm(`Toggle status for ${clinic.name}?`)) {
                              await supabaseClient
                                .from('clinics')
                                .update({ is_active: !clinic.is_active })
                                .eq('name', clinic.name)
                              window.location.reload()
                            }
                          }}
                          className={`text-sm ${clinic.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {clinic.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}