import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PrintButton from '@/components/PrintButton'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // Get invoice details
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invoice Not Found</h1>
          <Link href="/patients" className="text-blue-600">← Back to Patients</Link>
        </div>
      </div>
    )
  }

  // Get patient details
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', invoice.patient_id)
    .maybeSingle()

  // Get treatments
  const { data: treatments } = await supabase
    .from('treatments')
    .select('*')
    .in('id', invoice.treatment_ids || [])

  // Get clinic info
  const { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', invoice.clinic_id)
    .maybeSingle()

  // Get doctor info
  const { data: doctor } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', invoice.created_by)
    .maybeSingle()

  const grandTotal = invoice.grand_total || invoice.total || 0
  const subtotal = invoice.subtotal || 0
  const discountAmount = invoice.discount_amount || 0
  const vatAmount = invoice.vat_amount || 0
  const vatRate = invoice.vat_rate || 10

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="mb-4 flex justify-between items-center">
          <Link href={`/patients/${patient?.id}`} className="text-blue-600 hover:underline">
            ← Back to Patient
          </Link>
          <PrintButton />
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden" id="invoice-print">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
            <h1 className="text-3xl font-bold">INVOICE</h1>
            <div className="text-sm mt-2 opacity-90">#{invoice.invoice_number}</div>
          </div>

          <div className="p-8">
            {/* Clinic Info */}
            <div className="border-b pb-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800">{clinic?.name || 'Finest Dental Care'}</h2>
              <p className="text-gray-600 text-sm">{clinic?.address || '446/3, Third Lane, Nawala Rd, 10107'}</p>
              <p className="text-gray-600 text-sm">📞 {clinic?.phone || '+94 77 288 6121'}</p>
              <p className="text-gray-600 text-sm">✉️ {clinic?.email || 'contact@finestdentalcare.lk'}</p>
            </div>

            {/* Patient & Doctor */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Bill To</p>
                <p className="font-semibold text-gray-800">{patient?.first_name} {patient?.last_name}</p>
                {patient?.phone && <p className="text-sm text-gray-600 mt-1">📞 {patient.phone}</p>}
                {patient?.email && <p className="text-sm text-gray-600">✉️ {patient.email}</p>}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Provider</p>
                <p className="font-semibold text-gray-800">Dr. {doctor?.first_name} {doctor?.last_name}</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500">Invoice Date</p>
                <p className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p className="font-medium">{new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  invoice.status === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.status === 'paid' ? '✓ PAID' : '⏳ PENDING'}
                </span>
              </div>
            </div>

            {/* Treatments Table */}
            <h3 className="font-semibold text-gray-800 mb-3">Treatment Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse mb-6">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold">Description</th>
                    <th className="p-3 text-center text-sm font-semibold">Qty</th>
                    <th className="p-3 text-right text-sm font-semibold">Unit Price</th>
                    <th className="p-3 text-right text-sm font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {treatments && treatments.length > 0 ? (
                    treatments.map((treatment: any) => (
                      <tr key={treatment.id} className="border-b">
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{treatment.procedure_code} - {treatment.procedure_name}</div>
                          <div className="text-sm text-gray-500">{treatment.diagnosis}</div>
                          {treatment.tooth_number && (
                            <div className="text-xs text-gray-400 mt-1">Tooth #{treatment.tooth_number}</div>
                          )}
                        </td>
                        <td className="p-3 text-center">{treatment.quantity}</td>
                        <td className="p-3 text-right">${treatment.unit_price?.toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">${treatment.total_price?.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-500">No treatments found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Price Breakdown */}
            <div className="flex justify-end">
              <div className="w-80">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between py-2 text-red-600">
                    <span>Discount:</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">VAT ({vatRate}%):</span>
                  <span className="font-medium">+${vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 font-bold text-lg border-t mt-2">
                  <span>Grand Total:</span>
                  <span className="text-green-600">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 font-semibold mb-1">Notes:</p>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t mt-8 pt-4 text-center">
              <p className="text-xs text-gray-400">Thank you for choosing our dental clinic.</p>
              <p className="text-xs text-gray-400 mt-1">Please keep this invoice for your records. Payment due within 30 days.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}