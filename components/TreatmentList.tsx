'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'

export default function TreatmentList({ treatments, isDoctor, patientId }: any) {
  const [loading, setLoading] = useState(false)
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([])
  const supabase = createClient()

  async function createInvoice() {
    if (selectedTreatments.length === 0) {
      alert('Please select at least one treatment')
      return
    }

    if (!confirm(`Create invoice for ${selectedTreatments.length} selected treatment(s)?`)) return
    
    setLoading(true)

    const selectedItems = treatments.filter((t: any) => selectedTreatments.includes(t.id))
    const subtotal = selectedItems.reduce((sum: number, t: any) => sum + (t.total_price || 0), 0)
    const tax = subtotal * 0.1
    const total = subtotal + tax
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const { error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        patient_id: patientId,
        treatment_ids: selectedTreatments,
        subtotal: subtotal,
        tax: tax,
        total: total,
        status: 'sent'
      })

    if (error) {
      alert('Error creating invoice: ' + error.message)
    } else {
      await supabase
        .from('treatments')
        .update({ sent_to_reception: true, status: 'approved' })
        .in('id', selectedTreatments)
      
      alert(`✓ Invoice ${invoiceNumber} created and sent to reception!\nTotal: $${total.toFixed(2)}`)
      window.location.reload()
    }
    setLoading(false)
  }

  function toggleTreatment(treatmentId: string) {
    setSelectedTreatments(prev =>
      prev.includes(treatmentId)
        ? prev.filter(id => id !== treatmentId)
        : [...prev, treatmentId]
    )
  }

  if (treatments.length === 0) {
    return <div className="p-8 text-center text-gray-500">No treatments recorded yet</div>
  }

  return (
    <div>
      <div className="divide-y">
        {treatments.map((treatment: any) => (
          <div key={treatment.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start gap-3">
              {isDoctor && !treatment.sent_to_reception && (
                <input
                  type="checkbox"
                  checked={selectedTreatments.includes(treatment.id)}
                  onChange={() => toggleTreatment(treatment.id)}
                  className="mt-1 w-4 h-4"
                />
              )}
              <div className="flex-1">
                <div className="font-semibold text-blue-600">{treatment.procedure_code}</div>
                <div className="text-gray-800">{treatment.procedure_name}</div>
                <div className="text-sm text-gray-700 mt-1">Diagnosis: {treatment.diagnosis}</div>
                <div className="text-sm text-gray-600">
                  Qty: {treatment.quantity} × ${treatment.unit_price} = ${treatment.total_price?.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(treatment.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isDoctor && selectedTreatments.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={createInvoice}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {loading ? 'Creating...' : `Create Invoice (${selectedTreatments.length})`}
          </button>
        </div>
      )}
    </div>
  )
}