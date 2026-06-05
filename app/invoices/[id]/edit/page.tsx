'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [invoice, setInvoice] = useState<any>(null)
  const [treatments, setTreatments] = useState<any[]>([])
  const [formData, setFormData] = useState({
    discount_type: 'percentage',
    discount_value: 0,
    vat_rate: 10,
    notes: ''
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params
      setInvoiceId(id)
      loadInvoice(id)
    }
    loadParams()
  }, [params])

  async function loadInvoice(id: string) {
    setLoading(true)
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()
    
    if (invoiceData) {
      setInvoice(invoiceData)
      setFormData({
        discount_type: invoiceData.discount_type || 'percentage',
        discount_value: invoiceData.discount_value || 0,
        vat_rate: invoiceData.vat_rate || 10,
        notes: invoiceData.notes || ''
      })
      
      // Load treatments
      if (invoiceData.treatment_ids) {
        const { data: treatmentData } = await supabase
          .from('treatments')
          .select('*')
          .in('id', invoiceData.treatment_ids)
        setTreatments(treatmentData || [])
      }
    }
    setLoading(false)
  }

  const subtotal = treatments.reduce((sum, t) => sum + (t.total_price || 0), 0)
  let discountAmount = 0
  if (formData.discount_type === 'percentage') {
    discountAmount = subtotal * (formData.discount_value / 100)
  } else {
    discountAmount = formData.discount_value
  }
  const afterDiscount = subtotal - discountAmount
  const vatAmount = afterDiscount * (formData.vat_rate / 100)
  const grandTotal = afterDiscount + vatAmount

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('invoices')
      .update({
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        discount_amount: discountAmount,
        vat_rate: formData.vat_rate,
        vat_amount: vatAmount,
        grand_total: grandTotal,
        notes: formData.notes
      })
      .eq('id', invoiceId)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Invoice updated successfully!')
      router.push(`/invoices/${invoiceId}`)
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="p-8 text-center">Loading invoice...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href={`/invoices/${invoiceId}`} className="text-blue-600">
            ← Back to Invoice
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Edit Invoice #{invoice?.invoice_number}</h1>

          {/* Treatments Summary */}
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Treatments</h2>
            <div className="bg-gray-50 rounded-lg p-3">
              {treatments.map((treatment) => (
                <div key={treatment.id} className="flex justify-between py-1">
                  <span>{treatment.procedure_code} - {treatment.procedure_name}</span>
                  <span>${treatment.total_price?.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t mt-2 pt-2 font-bold flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Discount Type</label>
              <select
                className="w-full border rounded-lg p-2"
                value={formData.discount_type}
                onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Discount Value ({formData.discount_type === 'percentage' ? '%' : '$'})
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg p-2"
                value={formData.discount_value}
                onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value)})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">VAT Rate (%)</label>
              <input
                type="number"
                step="0.1"
                className="w-full border rounded-lg p-2"
                value={formData.vat_rate}
                onChange={(e) => setFormData({...formData, vat_rate: parseFloat(e.target.value)})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full border rounded-lg p-2"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between py-1">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between py-1 text-red-600">
                  <span>Discount:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span>VAT ({formData.vat_rate}%):</span>
                <span>+${vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-lg border-t mt-2">
                <span>Grand Total:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href={`/invoices/${invoiceId}`}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-center hover:bg-gray-300"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}