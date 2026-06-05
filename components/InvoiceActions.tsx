'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'
import Link from 'next/link'

export default function InvoiceActions({ invoice, patient, clinic, doctorName, treatments }: any) {
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  const grandTotal = invoice.grand_total || invoice.total || 0

  async function handleMarkAsPaid() {
    if (!confirm(`Mark invoice #${invoice.invoice_number} as paid?`)) return
    
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoice.id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('✓ Invoice marked as paid!')
      window.location.reload()
    }
  }

  async function handleSendEmail() {
    if (!patient?.email) {
      alert('Patient has no email address on file.')
      return
    }
    
    if (!confirm(`Send invoice #${invoice.invoice_number} to ${patient.email}?`)) return
    
    setSending(true)
    
    try {
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          patientEmail: patient.email,
          patientName: `${patient.first_name} ${patient.last_name}`,
          invoiceData: {
            ...invoice,
            clinic_name: clinic?.name,
            clinic_address: clinic?.address,
            clinic_phone: clinic?.phone,
            clinic_email: clinic?.email,
            doctor_name: doctorName,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            treatments: treatments
          }
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`✓ Invoice sent to ${patient.email}`)
      } else {
        alert('Failed to send email: ' + result.error)
      }
    } catch (error) {
      alert('Error sending email')
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col gap-1 mt-2">
      {/* View Invoice Button */}
      <Link
        href={`/invoices/${invoice.id}`}
        className="text-blue-600 text-sm hover:underline text-left"
      >
        📄 View Invoice
      </Link>
      
      {/* Edit Invoice Button - Only for unpaid/draft invoices */}
      {invoice.status !== 'paid' && (
        <Link
          href={`/invoices/${invoice.id}/edit`}
          className="text-green-600 text-sm hover:underline text-left"
        >
          ✏️ Edit Invoice (Discount/VAT)
        </Link>
      )}
      
      {/* Send Email Button - Only for unpaid invoices */}
      {invoice.status !== 'paid' && (
        <button
          onClick={handleSendEmail}
          disabled={sending}
          className="text-purple-600 text-sm hover:underline text-left disabled:opacity-50"
        >
          {sending ? 'Sending...' : '📧 Send to Patient'}
        </button>
      )}
      
      {/* Mark as Paid Button - Only for unpaid invoices */}
      {invoice.status !== 'paid' && (
        <button
          onClick={handleMarkAsPaid}
          className="text-green-600 text-sm hover:underline text-left"
        >
          💵 Mark as Paid
        </button>
      )}
    </div>
  )
}