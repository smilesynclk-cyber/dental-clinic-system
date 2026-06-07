'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Drug {
  id: string
  name: string
  category: string
  dosage_form: string
  strength: string
  manufacturer: string
  unit_price: number
  is_active: boolean
}

export default function DrugManagementPage() {
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    dosage_form: '',
    strength: '',
    manufacturer: '',
    unit_price: 0,
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

    // Check if user is doctor or admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single()

    if (user?.role !== 'doctor' && user?.role !== 'owner') {
      router.push('/protected/dashboard/reception')
      return
    }

    loadDrugs()
  }

  async function loadDrugs() {
    const { data } = await supabase
      .from('drugs')
      .select('*')
      .order('name')
    setDrugs(data || [])
    setLoading(false)
  }

  async function handleAddDrug(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('drugs')
      .insert([formData])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Drug added successfully!')
      setShowAddForm(false)
      setFormData({
        name: '',
        category: '',
        dosage_form: '',
        strength: '',
        manufacturer: '',
        unit_price: 0,
        is_active: true
      })
      loadDrugs()
    }
    setLoading(false)
  }

  async function handleUpdateDrug(drug: Drug) {
    const { error } = await supabase
      .from('drugs')
      .update({
        name: drug.name,
        category: drug.category,
        dosage_form: drug.dosage_form,
        strength: drug.strength,
        manufacturer: drug.manufacturer,
        unit_price: drug.unit_price,
        is_active: drug.is_active
      })
      .eq('id', drug.id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Drug updated successfully!')
      setEditingDrug(null)
      loadDrugs()
    }
  }

  async function handleDeleteDrug(id: string) {
    if (!confirm('Are you sure you want to delete this drug?')) return

    const { error } = await supabase
      .from('drugs')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Drug deleted successfully!')
      loadDrugs()
    }
  }

  const filteredDrugs = drugs.filter(drug =>
    drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    drug.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && drugs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">💊 Drug Management</h1>
            <p className="text-gray-500 mt-1">Manage medication inventory for prescriptions</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add New Drug
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <input
            type="text"
            placeholder="Search by name, category, or manufacturer..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Add Drug Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add New Drug</h2>
            <form onSubmit={handleAddDrug} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Drug Name *</label>
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
                  <option value="Antibiotic">Antibiotic</option>
                  <option value="NSAID">NSAID</option>
                  <option value="Analgesic">Analgesic</option>
                  <option value="Corticosteroid">Corticosteroid</option>
                  <option value="Antifungal">Antifungal</option>
                  <option value="Anesthetic">Anesthetic</option>
                  <option value="Antiseptic">Antiseptic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dosage Form</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={formData.dosage_form}
                  onChange={(e) => setFormData({...formData, dosage_form: e.target.value})}
                >
                  <option value="">Select Form</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Injection">Injection</option>
                  <option value="Mouthwash">Mouthwash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Strength</label>
                <input
                  type="text"
                  placeholder="e.g., 500mg"
                  className="w-full border rounded-lg p-2"
                  value={formData.strength}
                  onChange={(e) => setFormData({...formData, strength: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Manufacturer</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit Price (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded-lg p-2"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  Save Drug
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-300 px-4 py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Drugs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strength</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDrugs.map((drug) => (
                  <tr key={drug.id} className="hover:bg-gray-50">
                    {editingDrug?.id === drug.id ? (
                      <>
                        <td className="px-4 py-2"><input type="text" value={editingDrug.name} onChange={(e) => setEditingDrug({...editingDrug, name: e.target.value})} className="border rounded p-1 w-32" /></td>
                        <td className="px-4 py-2"><input type="text" value={editingDrug.category || ''} onChange={(e) => setEditingDrug({...editingDrug, category: e.target.value})} className="border rounded p-1 w-28" /></td>
                        <td className="px-4 py-2"><input type="text" value={editingDrug.dosage_form || ''} onChange={(e) => setEditingDrug({...editingDrug, dosage_form: e.target.value})} className="border rounded p-1 w-24" /></td>
                        <td className="px-4 py-2"><input type="text" value={editingDrug.strength || ''} onChange={(e) => setEditingDrug({...editingDrug, strength: e.target.value})} className="border rounded p-1 w-20" /></td>
                        <td className="px-4 py-2"><input type="text" value={editingDrug.manufacturer || ''} onChange={(e) => setEditingDrug({...editingDrug, manufacturer: e.target.value})} className="border rounded p-1 w-28" /></td>
                        <td className="px-4 py-2"><input type="number" step="0.01" value={editingDrug.unit_price} onChange={(e) => setEditingDrug({...editingDrug, unit_price: parseFloat(e.target.value)})} className="border rounded p-1 w-20" /></td>
                        <td className="px-4 py-2">
                          <button onClick={() => setEditingDrug({...editingDrug, is_active: !editingDrug.is_active})} className={`px-2 py-1 rounded text-xs ${editingDrug.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {editingDrug.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={() => handleUpdateDrug(editingDrug)} className="text-green-600 mr-2">Save</button>
                          <button onClick={() => setEditingDrug(null)} className="text-gray-600">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 font-medium">{drug.name}</td>
                        <td className="px-4 py-2">{drug.category || '-'}</td>
                        <td className="px-4 py-2">{drug.dosage_form || '-'}</td>
                        <td className="px-4 py-2">{drug.strength || '-'}</td>
                        <td className="px-4 py-2">{drug.manufacturer || '-'}</td>
                        <td className="px-4 py-2">Rs. {drug.unit_price?.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${drug.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {drug.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={() => setEditingDrug(drug)} className="text-blue-600 mr-2">Edit</button>
                          <button onClick={() => handleDeleteDrug(drug.id)} className="text-red-600">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add navigation link */}
        <div className="mt-6">
          <Link href="/protected/dashboard/doctor" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}