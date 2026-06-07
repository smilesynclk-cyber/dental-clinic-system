'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import ToothChart from './ToothChart'

export default function TreatmentForm({ patientId, doctorId }: { patientId: string; doctorId: string }) {
  const [loading, setLoading] = useState(false)
  const [procedures, setProcedures] = useState<any[]>([])
  const [loadingProcedures, setLoadingProcedures] = useState(true)
  const [dentitionType, setDentitionType] = useState<'permanent' | 'primary' | 'mixed'>('permanent')
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [selectedToothType, setSelectedToothType] = useState<string>('permanent')
  const [formData, setFormData] = useState({
    diagnosis: '',
    procedure_code: '',
    procedure_name: '',
    surface: '',
    quantity: 1,
    unit_price: 0,
    notes: ''
  })

  const supabase = createClient()

  // Load procedures from database (procedure library)
  useEffect(() => {
    fetchProcedures()
  }, [])

  async function fetchProcedures() {
    setLoadingProcedures(true)
    const { data, error } = await supabase
      .from('treatments')
      .select('id, procedure_code, procedure_name, unit_price, category, duration_minutes')
      .eq('is_active', true)
      .order('procedure_code', { ascending: true })

    if (error) {
      console.error('Error fetching procedures:', error)
    } else {
      setProcedures(data || [])
    }
    setLoadingProcedures(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const total = formData.quantity * formData.unit_price

    // Insert into the same treatments table (or your patient treatments table)
    const { error } = await supabase
      .from('treatments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        diagnosis: formData.diagnosis,
        procedure_code: formData.procedure_code,
        procedure_name: formData.procedure_name,
        tooth_number: selectedTooth,
        surface: formData.surface,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        total_price: total,
        notes: formData.notes,
        status: 'pending'
      })

    if (error) {
      alert('Error: ' + error.message)
      console.error('Insert error:', error)
    } else {
      alert('✓ Treatment added successfully!')
      setFormData({
        diagnosis: '',
        procedure_code: '',
        procedure_name: '',
        surface: '',
        quantity: 1,
        unit_price: 0,
        notes: ''
      })
      setSelectedTooth(null)
      window.location.reload()
    }
    setLoading(false)
  }

  function handleProcedureChange(code: string) {
    const procedure = procedures.find(p => p.procedure_code === code)
    if (procedure) {
      setFormData({
        ...formData,
        procedure_code: procedure.procedure_code,
        procedure_name: procedure.procedure_name,
        unit_price: procedure.unit_price
      })
    }
  }

  const handleToothSelect = (toothNumber: number, toothType: string) => {
    setSelectedTooth(toothNumber)
    setSelectedToothType(toothType)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tooth Chart Section */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">🦷 Tooth Selection</h3>
        <ToothChart
          onToothSelect={handleToothSelect}
          selectedTooth={selectedTooth}
          dentitionType={dentitionType}
          onDentitionChange={setDentitionType}
        />
        {selectedTooth && (
          <div className="mt-3 text-sm text-green-600">
            ✓ Selected Tooth: #{selectedTooth} ({selectedToothType === 'primary' ? 'Baby Tooth' : 'Adult Tooth'})
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Diagnosis *
          </label>
          <textarea
            rows={2}
            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            value={formData.diagnosis}
            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Procedure *
          </label>
          {loadingProcedures ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-500">Loading procedures...</span>
            </div>
          ) : (
            <select
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
              value={formData.procedure_code}
              onChange={(e) => handleProcedureChange(e.target.value)}
              required
            >
              <option value="">Select procedure...</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.procedure_code}>
                  {p.procedure_code} - {p.procedure_name} (Rs. {p.unit_price?.toFixed(2)})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Surface
          </label>
          <select
            className="w-full border rounded-lg p-2"
            value={formData.surface}
            onChange={(e) => setFormData({...formData, surface: e.target.value})}
          >
            <option value="">Select surface...</option>
            <option value="M">Mesial (M)</option>
            <option value="D">Distal (D)</option>
            <option value="O">Occlusal (O)</option>
            <option value="B">Buccal (B)</option>
            <option value="L">Lingual (L)</option>
            <option value="MO">Mesio-Occlusal (MO)</option>
            <option value="DO">Disto-Occlusal (DO)</option>
            <option value="MOD">Mesio-Occluso-Distal (MOD)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            className="w-full border rounded-lg p-2"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit Price (Rs.)
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded-lg p-2"
            value={formData.unit_price}
            onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            className="w-full border rounded-lg p-2"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
      >
        {loading ? 'Adding Treatment...' : '➕ Add Treatment'}
      </button>
    </form>
  )
}