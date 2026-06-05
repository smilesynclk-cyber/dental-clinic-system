'use client'

import Link from 'next/link'

interface InvoiceData {
  id: string
  invoice_number: string
  date: string
  subtotal: number
  discount_type: string
  discount_value: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  total: number
  grand_total: number
  status: string
  created_at: string
  paid_at: string | null
  notes: string
  clinic_name?: string
  clinic_address?: string
  clinic_phone?: string
  clinic_email?: string
  doctor_name?: string
  patient_name?: string
  patient_address?: string
  treatments: any[]
}

export default function InvoiceView({ invoice, onClose, onSendEmail }: any) {
  const handlePrint = () => {
    window.print()
  }

  const grandTotal = invoice.grand_total || invoice.total || 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Invoice Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">INVOICE</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">
              &times;
            </button>
          </div>
          <div className="text-sm mt-1">Invoice #{invoice.invoice_number}</div>
        </div>

        {/* Invoice Content */}
        <div className="p-6" id="invoice-print">
          {/* Clinic Info */}
          <div className="border-b pb-4 mb-4">
            <h3 className="text-xl font-bold text-gray-800">{invoice.clinic_name || 'Dental Clinic'}</h3>
            <p className="text-sm text-gray-600">{invoice.clinic_address || '123 Dental Street, Health City'}</p>
            <p className="text-sm text-gray-600">Phone: {invoice.clinic_phone || '+1 234 567 8900'}</p>
            <p className="text-sm text-gray-600">Email: {invoice.clinic_email || 'info@dentalclinic.com'}</p>
          </div>

          {/* Patient & Doctor Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Bill To:</p>
              <p className="font-semibold">{invoice.patient_name}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Provider:</p>
              <p className="font-semibold">Dr. {invoice.doctor_name}</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500">Invoice Date</p>
              <p className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Invoice No.</p>
              <p className="font-medium">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <span className={`px-2 py-1 rounded text-xs ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {invoice.status === 'paid' ? 'PAID' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Treatments Table */}
          <table className="w-full border-collapse mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-right">Unit Price</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.treatments?.map((treatment: any, idx: number) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">
                    <div className="font-medium">{treatment.procedure_code} - {treatment.procedure_name}</div>
                    <div className="text-xs text-gray-500">{treatment.diagnosis}</div>
                    {treatment.tooth_number && (
                      <div className="text-xs text-gray-400">Tooth #{treatment.tooth_number}</div>
                    )}
                  </td>
                  <td className="p-2 text-center">{treatment.quantity}</td>
                  <td className="p-2 text-right">${treatment.unit_price?.toFixed(2)}</td>
                  <td className="p-2 text-right font-medium">${treatment.total_price?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Price Breakdown */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-80">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>${invoice.subtotal?.toFixed(2)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between py-1 text-red-600">
                    <span>Discount:</span>
                    <span>-${invoice.discount_amount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span>VAT ({invoice.vat_rate}%):</span>
                  <span>${invoice.vat_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-lg border-t mt-1">
                  <span>Grand Total:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
                {invoice.notes && (
                  <div className="mt-4 p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Notes:</p>
                    <p className="text-sm">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t mt-6 pt-4 text-center text-xs text-gray-400">
            <p>Thank you for choosing our dental clinic. Please keep this invoice for your records.</p>
            <p>Payment due within 30 days.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3 justify-end">
          <button
            onClick={handlePrint}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            🖨️ Print
          </button>
          {invoice.status !== 'paid' && onSendEmail && (
            <button
              onClick={onSendEmail}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              📧 Send to Patient
            </button>
          )}
        </div>
      </div>
    </div>
  )
}