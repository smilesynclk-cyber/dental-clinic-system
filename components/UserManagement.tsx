'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  clinic_id?: string
  clinics?: { id: string; name: string }
}

export default function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [clinics, setClinics] = useState<any[]>([])
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'receptionist',
    clinic_id: ''
  })

  // Fetch clinics for dropdown
  useEffect(() => {
    const fetchClinics = async () => {
      const { data } = await supabase.from('clinics').select('id, name')
      setClinics(data || [])
    }
    fetchClinics()
  }, [])

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.first_name,
          lastName: formData.last_name,
          role: formData.role,
          clinicId: formData.clinic_id
        })
      })

      const result = await response.json()
      
      if (result.error) {
        if (result.error.includes('duplicate') || result.error.includes('already exists')) {
          alert('User with this email already exists. Please use a different email.')
        } else {
          alert('Error: ' + result.error)
        }
      } else {
        alert('User added successfully!')
        setShowAddForm(false)
        setFormData({ email: '', password: '', first_name: '', last_name: '', role: 'receptionist', clinic_id: '' })
        // Refresh the user list
        refreshUsers()
      }
    } catch (error) {
      alert('Error creating user')
    }
    setLoading(false)
  }

  async function refreshUsers() {
    const { data: usersData } = await supabase
      .from('users')
      .select(`
        *,
        clinics (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (usersData) {
      setUsers(usersData)
    }
  }

  async function handleUpdateUser(user: User) {
    const { error } = await supabase
      .from('users')
      .update({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role,
        is_active: user.is_active,
        clinic_id: user.clinic_id
      })
      .eq('id', user.id)

    if (error) {
      alert('Error updating user: ' + error.message)
    } else {
      alert('User updated successfully!')
      setEditingUser(null)
      refreshUsers()
    }
  }

  async function handleDeleteUser(userId: string, email: string, role: string) {
    if (role === 'owner') {
      alert('Cannot delete the main admin account!')
      return
    }
    if (!confirm(`Delete user ${email}? This action cannot be undone.`)) return

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      alert('Error deleting user: ' + error.message)
    } else {
      alert('User deleted successfully!')
      refreshUsers()
    }
  }

  async function handleResetPassword(email: string) {
    if (!confirm(`Send password reset email to ${email}?`)) return
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`✓ Password reset email sent to ${email}`)
    }
  }

  const getClinicName = (user: User) => {
    if (user.clinics?.name) return user.clinics.name
    if (user.clinic_id) {
      const clinic = clinics.find(c => c.id === user.clinic_id)
      return clinic?.name || '-'
    }
    return '-'
  }

  return (
    <div className="p-4">
      {/* Add User Button */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
      >
        + Add New User
      </button>

      {/* Add User Form */}
      {showAddForm && (
        <form onSubmit={handleAddUser} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
          <h3 className="font-semibold mb-3">Add New User</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="Email"
              className="px-3 py-2 border rounded"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="px-3 py-2 border rounded"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="First Name"
              className="px-3 py-2 border rounded"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              className="px-3 py-2 border rounded"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              required
            />
            <select
              className="px-3 py-2 border rounded"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="owner">Admin</option>
            </select>
            <select
              className="px-3 py-2 border rounded"
              value={formData.clinic_id}
              onChange={(e) => setFormData({...formData, clinic_id: e.target.value})}
            >
              <option value="">Select Clinic</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
              {loading ? 'Adding...' : 'Add User'}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-300 px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Role</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Clinic</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                {editingUser?.id === user.id ? (
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={editingUser.first_name || ''}
                        onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                        className="border rounded px-2 py-1 w-24"
                      />
                      <input
                        type="text"
                        value={editingUser.last_name || ''}
                        onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                        className="border rounded px-2 py-1 w-24 ml-1"
                      />
                    </td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                        className="border rounded px-2 py-1"
                      >
                        <option value="doctor">Doctor</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="owner">Admin</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={editingUser.clinic_id || ''}
                        onChange={(e) => setEditingUser({...editingUser, clinic_id: e.target.value})}
                        className="border rounded px-2 py-1 w-32"
                      >
                        <option value="">Select Clinic</option>
                        {clinics.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setEditingUser({...editingUser, is_active: !editingUser.is_active})}
                        className={`px-2 py-1 rounded text-xs ${editingUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {editingUser.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => handleUpdateUser(editingUser)} className="text-green-600 mr-2">Save</button>
                      <button onClick={() => setEditingUser(null)} className="text-gray-600">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">{user.first_name || ''} {user.last_name || ''}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2 capitalize">{user.role}</td>
                    <td className="px-3 py-2">{getClinicName(user)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => setEditingUser(user)} className="text-blue-600 mr-2 hover:text-blue-800">
                        Edit
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.email)}
                        className="text-yellow-600 mr-2 hover:text-yellow-800"
                        title="Reset Password"
                      >
                        🔐 Reset
                      </button>
                      <button onClick={() => handleDeleteUser(user.id, user.email, user.role)} className="text-red-600 hover:text-red-800">
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}