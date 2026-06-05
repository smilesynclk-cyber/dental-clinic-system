'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'

export default function TreatmentForm({ patientId, doctorId }: { patientId: string; doctorId: string }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    diagnosis: '',
    procedure_code: '',
    procedure_name: '',
    tooth_number: '',
    surface: '',
    quantity: 1,
    unit_price: 0,
    notes: ''
  })

  const supabase = createClient()

  const procedureCodes = [
    { code: 'D1110', name: 'Prophylaxis - Adult', price: 85 },
    { code: 'D1120', name: 'Prophylaxis - Child', price: 65 },
    { code: 'D0120', name: 'Periodic Oral Evaluation', price: 50 },
    { code: 'D2330', name: 'Resin - 1 surface, anterior', price: 150 },
    { code: 'D2391', name: 'Resin - 1 surface, posterior', price: 175 },
    { code: 'D2740', name: 'Crown - Porcelain/Ceramic', price: 1200 },
    { code: 'D7140', name: 'Extraction - Erupted Tooth', price: 150 },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const total = formData.quantity * formData.unit_price

    const { error } = await supabase
      .from('treatments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        diagnosis: formData.diagnosis,
        procedure_code: formData.procedure_code,
        procedure_name: formData.procedure_name,
        tooth_number: formData.tooth_number ? parseInt(formData.tooth_number) : null,
        surface: formData.surface,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        total_price: total,
        notes: formData.notes,
        status: 'pending'
      })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('✓ Treatment added successfully!')
      setFormData({
        diagnosis: '',
        procedure_code: '',
        procedure_name: '',
        tooth_number: '',
        surface: '',
        quantity: 1,
        unit_price: 0,
        notes: ''
      })
      window.location.reload()
    }
    setLoading(false)
  }

  function handleProcedureChange(code: string) {
    const procedure = procedureCodes.find(p => p.code === code)
    if (procedure) {
      setFormData({
        ...formData,
        procedure_code: procedure.code,
        procedure_name: procedure.name,
        unit_price: procedure.price
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Diagnosis *</label>
          <textarea
            rows={2}
            className="w-full border rounded-lg p-2"
            value={formData.diagnosis}
            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Procedure *</label>
          <select
            className="w-full border rounded-lg p-2"
            value={formData.procedure_code}
            onChange={(e) => handleProcedureChange(e.target.value)}
            required
          >
            <option value="">Select procedure...</option>
            {procedureCodes.map(p => (
              <option key={p.code} value={p.code}>{p.code} - {p.name} (${p.price})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tooth Number</label>
          <input
            type="number"
            className="w-full border rounded-lg p-2"
            placeholder="e.g., 18"
            value={formData.tooth_number}
            onChange={(e) => setFormData({...formData, tooth_number: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            type="number"
            className="w-full border rounded-lg p-2"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Unit Price (LKR)</label>
          <input
            type="number"
            className="w-full border rounded-lg p-2"
            value={formData.unit_price}
            onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
            step="0.01"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Notes</label>
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
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Treatment'}
      </button>
    </form>
  )
}