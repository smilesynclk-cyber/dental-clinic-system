'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'

export default function PaymentModal({ invoiceId, amount, onClose, onSuccess }: any) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function processPayment() {
    setLoading(true)
    
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: 'paid', 
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod
      })
      .eq('id', invoiceId)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`✓ Payment of $${amount} collected successfully!`)
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Collect Payment</h2>
        
        <div className="mb-4">
          <p className="text-gray-600">Invoice Amount</p>
          <p className="text-3xl font-bold text-green-600">${amount.toFixed(2)}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Payment Method</label>
          <select
            className="w-full border rounded-lg p-2"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="cash">💵 Cash</option>
            <option value="credit_card">💳 Credit Card</option>
            <option value="debit_card">💳 Debit Card</option>
            <option value="insurance">🏥 Insurance</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={processPayment}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}