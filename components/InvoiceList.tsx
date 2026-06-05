'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'

interface Invoice {
  id: string
  invoice_number: string
  total: number
  status: string
  created_at: string
  paid_at: string | null
  patients?: {
    first_name: string
    last_name: string
    phone?: string
  }
}

export default function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const totalPending = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

  async function processPayment(invoiceId: string, amount: number) {
    if (!confirm(`Process payment of $${amount.toFixed(2)}?`)) return
    
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
      alert(`✅ Payment of $${amount.toFixed(2)} collected successfully!`)
      window.location.reload()
    }
    setLoading(false)
    setSelectedInvoice(null)
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-3 flex justify-between items-center">
          <h2 className="font-semibold text-white text-lg">💰 Pending Invoices</h2>
          <div className="text-white text-lg font-bold">Total: $0.00</div>
        </div>
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">✅</div>
          <p>No pending invoices</p>
          <p className="text-sm mt-1">All invoices have been paid</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-3 flex justify-between items-center">
          <h2 className="font-semibold text-white text-lg">💰 Pending Invoices</h2>
          <div className="text-white text-lg font-bold">
            Total: ${totalPending.toFixed(2)}
          </div>
        </div>
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">
                    Invoice #{invoice.invoice_number}
                  </div>
                  <div className="text-sm text-gray-600">
                    Patient: {invoice.patients?.first_name} {invoice.patients?.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Date: {new Date(invoice.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${invoice.total?.toFixed(2)}
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(invoice)}
                    className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 transition"
                  >
                    💵 Collect Payment
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold mb-4">Collect Payment</h2>
            
            <div className="mb-4">
              <p className="text-gray-600">Invoice #{selectedInvoice.invoice_number}</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                ${selectedInvoice.total?.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Patient: {selectedInvoice.patients?.first_name} {selectedInvoice.patients?.last_name}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500"
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
                onClick={() => processPayment(selectedInvoice.id, selectedInvoice.total)}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
              >
                {loading ? 'Processing...' : 'Confirm Payment'}
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}