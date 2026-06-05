import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TreatmentForm from '@/components/TreatmentForm'
import TreatmentList from '@/components/TreatmentList'
import InvoiceActions from '@/components/InvoiceActions'
import DrugForm from '@/components/DrugForm'
import PrescriptionList from '@/components/PrescriptionList'
import SharePatientFolder from '@/components/SharePatientFolder'

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // IMPORTANT: In Next.js 16, params is a Promise - must await it
  const { id } = await params
  
  console.log('Patient ID received:', id)
  
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Get current user from database
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, clinic_id, first_name, last_name, id')
    .eq('email', authUser.email)
    .single()

  // Fetch patient details
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Patient Not Found</h1>
          <Link href="/patients" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            ← Back to Patients
          </Link>
        </div>
      </div>
    )
  }

  // Fetch treatments for this patient
  const { data: treatments } = await supabase
    .from('treatments')
    .select('*')
    .eq('patient_id', id)
    .order('created_at', { ascending: false })

  // Fetch invoices for this patient
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('patient_id', id)
    .order('created_at', { ascending: false })

  // Fetch prescriptions for this patient with drug and doctor details
  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select(`
      *,
      drugs (
        id,
        name,
        category,
        dosage_form,
        strength,
        manufacturer
      ),
      doctor:users!doctor_id (
        id,
        first_name,
        last_name
      )
    `)
    .eq('patient_id', id)
    .order('issued_date', { ascending: false })

  // Get clinic info
  const { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', currentUser?.clinic_id)
    .single()

  const isDoctor = currentUser?.role === 'doctor'
  const isReceptionist = currentUser?.role === 'receptionist'

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md border-b-4 border-blue-500 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">
                👨‍⚕️ {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Medical Records & Treatment History</p>
            </div>
            <div className="flex gap-3">
              {isReceptionist && (
                <Link 
                  href={`/appointments/new?patientId=${patient.id}`}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                >
                  📅 Schedule Appointment
                </Link>
              )}
              <Link href="/patients" className="text-gray-600 hover:text-gray-800">
                ← Back to Patients
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Patient Information Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3">
            <h2 className="text-white font-semibold text-lg">📋 Patient Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{patient.first_name} {patient.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium text-gray-900">{patient.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-900">{patient.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium text-gray-900">{formatDate(patient.date_of_birth)}</p>
              </div>
            </div>
            {patient.address && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{patient.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Doctor Section - Add Treatment */}
        {isDoctor && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-3">
              <h2 className="text-white font-semibold text-lg">➕ Add Treatment Record</h2>
            </div>
            <div className="p-6">
              <TreatmentForm patientId={id} doctorId={currentUser.id} />
            </div>
          </div>
        )}

        {/* Treatments List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-3">
            <h2 className="text-white font-semibold text-lg">📋 Treatment History</h2>
          </div>
          <TreatmentList treatments={treatments || []} isDoctor={isDoctor} patientId={id} />
        </div>

        {/* Prescriptions Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-3">
            <h2 className="text-white font-semibold text-lg">💊 Prescriptions & Medications</h2>
          </div>
          <div className="p-6">
            {isDoctor && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-3">Issue New Prescription</h3>
                <DrugForm 
                  patientId={id} 
                  doctorId={currentUser.id}
                />
              </div>
            )}
            <PrescriptionList patientId={id} />
          </div>
        </div>

        {/* Invoices List */}
        {invoices && invoices.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3">
              <h2 className="text-white font-semibold text-lg">💰 Invoices</h2>
            </div>
            <div className="divide-y">
              {invoices.map((invoice: any) => {
                const grandTotal = invoice.grand_total || invoice.total || 0
                const doctorName = currentUser?.first_name || 'Staff'
                
                return (
                  <div key={invoice.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          Invoice #{invoice.invoice_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          Date: {new Date(invoice.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Treatments: {invoice.treatment_ids?.length || 0} items
                        </div>
                        {invoice.discount_amount > 0 && (
                          <div className="text-xs text-red-500">
                            Discount: ${invoice.discount_amount?.toFixed(2)}
                          </div>
                        )}
                        <div className="text-lg font-bold text-green-600 mt-1">
                          Grand Total: ${grandTotal.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status === 'paid' ? '✓ Paid' :
                           invoice.status === 'sent' ? '📨 Sent' :
                           '📝 Draft'}
                        </span>
                        
                        <InvoiceActions 
                          invoice={invoice}
                          patient={patient}
                          clinic={clinic}
                          doctorName={doctorName}
                          treatments={treatments?.filter(t => invoice.treatment_ids?.includes(t.id)) || []}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Share PDF Button - Now with prescriptions included */}
        <div className="mt-6 flex justify-end">
          <SharePatientFolder 
            patient={patient}
            treatments={treatments || []}
            prescriptions={prescriptions || []}
            invoices={invoices || []}
          />
        </div>
      </main>
    </div>
  )
}