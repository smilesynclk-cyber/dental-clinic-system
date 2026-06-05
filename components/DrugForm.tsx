'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'

interface Drug {
  id: string
  name: string
  category: string
  dosage_form: string
  strength: string
  manufacturer: string
  unit_price: number
}

export default function DrugForm({ patientId, doctorId }: { patientId: string; doctorId: string }) {
  const [loading, setLoading] = useState(false)
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [formData, setFormData] = useState({
    dosage: '',
    frequency: '',
    duration: '',
    quantity: 1,
    instructions: ''
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    fetchDrugs()
  }, [])

  async function fetchDrugs() {
    setError('')
    
    console.log('Fetching drugs...')
    
    const { data, error: fetchError } = await supabase
      .from('drugs')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (fetchError) {
      console.error('Error fetching drugs:', fetchError)
      setError(fetchError.message)
    } else {
      setDrugs(data || [])
      if (!data || data.length === 0) {
        setError('No drugs found. Please contact administrator to add drugs.')
      }
    }
  }

  const filteredDrugs = drugs.filter(drug =>
    drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (drug.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDrug) {
      alert('Please select a drug')
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        drug_id: selectedDrug.id,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration,
        quantity: formData.quantity,
        instructions: formData.instructions,
        status: 'active',
        issued_date: new Date().toISOString()
      })

    if (insertError) {
      alert('Error: ' + insertError.message)
    } else {
      alert('✓ Prescription issued successfully!')
      setSelectedDrug(null)
      setSearchTerm('')
      setFormData({ dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' })
      router.refresh()
    }
    setLoading(false)
  }

  function selectDrug(drug: Drug) {
    setSelectedDrug(drug)
    setSearchTerm(drug.name)
    setShowDropdown(false)
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return <div className="py-4"></div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drug Search */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search Drug *
        </label>
        <input
          type="text"
          placeholder="Type drug name to search..."
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setShowDropdown(true)
            if (selectedDrug) setSelectedDrug(null)
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {showDropdown && searchTerm && filteredDrugs.length > 0 && !selectedDrug && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredDrugs.map((drug) => (
              <div
                key={drug.id}
                className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                onClick={() => selectDrug(drug)}
              >
                <div className="font-medium">{drug.name}</div>
                <div className="text-xs text-gray-500">
                  {drug.strength} | {drug.dosage_form} | {drug.manufacturer}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
          <button 
            type="button"
            onClick={fetchDrugs} 
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Selected Drug Display */}
      {selectedDrug && (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-green-800">{selectedDrug.name}</p>
              <p className="text-xs text-green-600">
                {selectedDrug.strength} | {selectedDrug.dosage_form} | {selectedDrug.manufacturer}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDrug(null)
                setSearchTerm('')
              }}
              className="text-red-500 text-sm hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Prescription Details */}
      {selectedDrug && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dosage *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., 1 tablet"
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.dosage}
              onChange={(e) => setFormData({...formData, dosage: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency *
            </label>
            <select
              required
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
            >
              <option value="">Select frequency</option>
              <option value="Once daily">Once daily</option>
              <option value="Twice daily">Twice daily</option>
              <option value="Three times daily">Three times daily</option>
              <option value="Four times daily">Four times daily</option>
              <option value="Every 4 hours">Every 4 hours</option>
              <option value="Every 6 hours">Every 6 hours</option>
              <option value="Every 8 hours">Every 8 hours</option>
              <option value="As needed">As needed</option>
              <option value="Before meals">Before meals</option>
              <option value="After meals">After meals</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., 5 days, 2 weeks"
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              required
              min="1"
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructions
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Additional instructions for the patient..."
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !selectedDrug}
        className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
      >
        {loading ? 'Issuing...' : '💊 Issue Prescription'}
      </button>
    </form>
  )
}