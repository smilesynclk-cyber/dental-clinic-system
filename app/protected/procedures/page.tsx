'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Procedure {
  id: string
  procedure_code: string
  procedure_name: string
  unit_price: number
  category: string
  duration_minutes: number
  is_active: boolean
}

export default function ProcedureManagementPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    default_fee: 0,
    category: '',
    duration_minutes: 30,
    is_active: true
  })

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  async function checkAuthAndLoad() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (user?.role !== 'doctor' && user?.role !== 'owner') {
      router.push('/protected/dashboard/reception')
      return
    }

    loadProcedures()
  }

  async function loadProcedures() {
    const { data } = await supabase
      .from('treatments')
      .select('*')
      .order('procedure_code', { ascending: true })
    setProcedures(data || [])
    setLoading(false)
  }

  async function handleAddProcedure(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('treatments')
      .insert([{
        procedure_code: formData.code,
        procedure_name: formData.name,
        unit_price: formData.default_fee,
        category: formData.category,
        duration_minutes: formData.duration_minutes,
        is_active: formData.is_active
      }])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Procedure added successfully!')
      setShowAddForm(false)
      setFormData({
        code: '',
        name: '',
        default_fee: 0,
        category: '',
        duration_minutes: 30,
        is_active: true
      })
      loadProcedures()
    }
    setLoading(false)
  }

  async function handleUpdateProcedure(procedure: Procedure) {
    const { error } = await supabase
      .from('treatments')
      .update({
        procedure_code: procedure.procedure_code,
        procedure_name: procedure.procedure_name,
        unit_price: procedure.unit_price,
        category: procedure.category,
        duration_minutes: procedure.duration_minutes,
        is_active: procedure.is_active
      })
      .eq('id', procedure.id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Procedure updated successfully!')
      setEditingProcedure(null)
      loadProcedures()
    }
  }

  async function handleDeleteProcedure(id: string) {
    if (!confirm('Are you sure you want to delete this procedure?')) return

    const { error } = await supabase
      .from('treatments')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Procedure deleted successfully!')
      loadProcedures()
    }
  }

  const filteredProcedures = procedures.filter(proc =>
    proc.procedure_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proc.procedure_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proc.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && procedures.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🦷 Procedure Management</h1>
            <p className="text-gray-500 mt-1">Manage dental treatment procedures and pricing</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add New Procedure
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <input
            type="text"
            placeholder="Search by code, name, or category..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add New Procedure</h2>
            <form onSubmit={handleAddProcedure} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Procedure Code *</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg p-2"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="e.g., D1110"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Procedure Name *</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg p-2"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  <option value="preventive">Preventive</option>
                  <option value="diagnostic">Diagnostic</option>
                  <option value="restorative">Restorative</option>
                  <option value="surgical">Surgical</option>
                  <option value="endodontic">Endodontic</option>
                  <option value="periodontic">Periodontic</option>
                  <option value="prosthodontic">Prosthodontic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Fee (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg p-2"
                  value={formData.default_fee}
                  onChange={(e) => setFormData({...formData, default_fee: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg p-2"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  Save Procedure
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-300 px-4 py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee (Rs.)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProcedures.map((proc) => (
                  <tr key={proc.id} className="hover:bg-gray-50">
                    {editingProcedure?.id === proc.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editingProcedure.procedure_code}
                            onChange={(e) => setEditingProcedure({...editingProcedure, procedure_code: e.target.value})}
                            className="border rounded p-1 w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editingProcedure.procedure_name}
                            onChange={(e) => setEditingProcedure({...editingProcedure, procedure_name: e.target.value})}
                            className="border rounded p-1 w-32"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editingProcedure.category || ''}
                            onChange={(e) => setEditingProcedure({...editingProcedure, category: e.target.value})}
                            className="border rounded p-1 w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingProcedure.unit_price}
                            onChange={(e) => setEditingProcedure({...editingProcedure, unit_price: parseFloat(e.target.value)})}
                            className="border rounded p-1 w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editingProcedure.duration_minutes}
                            onChange={(e) => setEditingProcedure({...editingProcedure, duration_minutes: parseInt(e.target.value)})}
                            className="border rounded p-1 w-20"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => setEditingProcedure({...editingProcedure, is_active: !editingProcedure.is_active})}
                            className={`px-2 py-1 rounded text-xs ${editingProcedure.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                          >
                            {editingProcedure.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={() => handleUpdateProcedure(editingProcedure)} className="text-green-600 mr-2">Save</button>
                          <button onClick={() => setEditingProcedure(null)} className="text-gray-600">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 font-mono text-sm">{proc.procedure_code}</td>
                        <td className="px-4 py-2 font-medium">{proc.procedure_name}</td>
                        <td className="px-4 py-2 capitalize">{proc.category || '-'}</td>
                        <td className="px-4 py-2">Rs. {proc.unit_price?.toFixed(2)}</td>
                        <td className="px-4 py-2">{proc.duration_minutes || 30} min</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${proc.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {proc.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={() => setEditingProcedure(proc)} className="text-blue-600 mr-2">Edit</button>
                          <button onClick={() => handleDeleteProcedure(proc.id)} className="text-red-600">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/protected/dashboard/doctor" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
          <Link href="/protected/drugs" className="text-purple-600 hover:underline">
            Manage Drugs →
          </Link>
        </div>
      </div>
    </div>
  )
}