'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [showResetPassword, setShowResetPassword] = useState<any>(null)
  const [togglingClinic, setTogglingClinic] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'receptionist',
    clinic_id: ''
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  async function checkAdminAndLoadData() {
    setLoading(true)
    
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

    setIsAdmin(true)
    await loadData()
  }

  async function loadData() {
    setLoading(true)
    
    // Get all users with clinic info
    const { data: usersData } = await supabase
      .from('users')
      .select('*, clinics(id, name)')
      .order('created_at', { ascending: false })

    setUsers(usersData || [])

    // Get system settings
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    setSettings(settingsData || {})

    // Get subscription info with clinic IDs
    const { data: subsData } = await supabase
      .from('clinics')
      .select('id, name, subscription_plan, subscription_expires_at, is_active')
      .order('name')

    setSubscriptions(subsData || [])
    setLoading(false)
  }

  async function toggleClinicStatus(clinicId: string, currentStatus: boolean) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this clinic?`)) {
      return
    }

    setTogglingClinic(clinicId)
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ is_active: !currentStatus })
        .eq('id', clinicId)

      if (error) throw error

      alert(`✓ Clinic ${currentStatus ? 'deactivated' : 'activated'} successfully!`)
      await loadData() // Reload the data to refresh the UI
    } catch (error: any) {
      console.error('Error toggling clinic status:', error)
      alert('Error: ' + error.message)
    } finally {
      setTogglingClinic(null)
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            clinic_id: formData.clinic_id || null
          })

        if (userError) throw userError

        alert(`✓ ${formData.role} created successfully!`)
        setShowAddUser(false)
        setFormData({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          role: 'receptionist',
          clinic_id: ''
        })
        await loadData()
      }
    } catch (error: any) {
      console.error('Error adding user:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          role: editingUser.role,
          clinic_id: editingUser.clinic_id
        })
        .eq('id', editingUser.id)

      if (error) throw error

      alert('✓ User updated successfully!')
      setEditingUser(null)
      await loadData()
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(userId: string, userEmail: string) {
    if (!showResetPassword) {
      setShowResetPassword({ id: userId, email: userEmail })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.admin.resetPasswordForEmail(userEmail)
      
      if (error) throw error

      alert('✓ Password reset email sent!')
      setShowResetPassword(null)
    } catch (error: any) {
      console.error('Error resetting password:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(userId: string, userEmail: string) {
    if (!confirm(`Are you sure you want to delete ${userEmail}? This action cannot be undone.`)) return

    setLoading(true)
    try {
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (userError) throw userError

      alert('✓ User deleted successfully!')
      await loadData()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'doctor': return 'bg-blue-100 text-blue-800'
      case 'receptionist': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'owner': return '👑'
      case 'doctor': return '👨‍⚕️'
      case 'receptionist': return '💁'
      default: return '👤'
    }
  }

  const totalUsers = users.length
  const activeClinics = subscriptions.filter((c: any) => c.is_active === true).length
  const expiringSoon = subscriptions.filter((c: any) => {
    if (!c.subscription_expires_at) return false
    const daysLeft = Math.ceil((new Date(c.subscription_expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    return daysLeft <= 7 && daysLeft > 0
  }).length

  if (loading && users.length === 0) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
              <p className="text-gray-500">System Administration Dashboard</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddUser(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
              >
                <span>➕</span>
                Add New User
              </button>
              <Link 
                href="/protected/admin/monitoring" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
              >
                <span>📊</span>
                System Monitoring
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <div className="text-2xl text-gray-400">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Clinics</p>
                <p className="text-2xl font-bold">{activeClinics}</p>
              </div>
              <div className="text-2xl text-green-500">🏥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{expiringSoon}</p>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
          </div>

          <Link 
            href="/protected/admin/monitoring"
            className="bg-blue-50 border border-blue-200 rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer block"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">System Health</p>
                <p className="text-2xl font-bold text-blue-700">Monitor</p>
                <p className="text-xs text-gray-500 mt-1">View database stats</p>
              </div>
              <div className="text-3xl text-blue-500">📊</div>
            </div>
          </Link>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">👥 User Management</h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              + Add User
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xl">{getRoleIcon(user.role)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.clinics?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit User"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleResetPassword(user.id, user.email)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Reset Password"
                        >
                          🔑 Reset
                        </button>
                        {user.role !== 'owner' && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete User"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Overview */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    <tr key={clinic.id}>
                      <td className="px-4 py-3 text-sm font-medium">{clinic.name}</td>
                      <td className="px-4 py-3 text-sm capitalize">{clinic.subscription_plan || 'Free'}</td>
                      <td className="px-4 py-3 text-sm">
                        {clinic.subscription_expires_at 
                          ? new Date(clinic.subscription_expires_at).toLocaleDateString()
                          : 'N/A'}
                        {daysLeft !== null && daysLeft > 0 && (
                          <span className={`text-xs ml-2 ${isExpiring ? 'text-yellow-600 font-medium' : 'text-gray-400'}`}>
                            ({daysLeft} days left)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          clinic.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {clinic.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleClinicStatus(clinic.id, clinic.is_active)}
                          disabled={togglingClinic === clinic.id}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            clinic.is_active 
                              ? 'bg-red-600 text-white hover:bg-red-700' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          } disabled:opacity-50`}
                        >
                          {togglingClinic === clinic.id ? 'Processing...' : (clinic.is_active ? 'Deactivate' : 'Activate')}
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

      {/* Add User Modal - Keep your existing modal code */}
      {showAddUser && (
        // ... your existing add user modal code
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            <form onSubmit={handleAddUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Clinic</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.clinic_id}
                    onChange={(e) => setFormData({...formData, clinic_id: e.target.value})}
                  >
                    <option value="">Select Clinic</option>
                    {subscriptions.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal - Keep your existing edit modal code */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleUpdateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={editingUser.first_name}
                    onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    value={editingUser.last_name}
                    onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="doctor">Doctor</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Clinic</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={editingUser.clinic_id || ''}
                    onChange={(e) => setEditingUser({...editingUser, clinic_id: e.target.value})}
                  >
                    <option value="">Select Clinic</option>
                    {subscriptions.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {loading ? 'Updating...' : 'Update User'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
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