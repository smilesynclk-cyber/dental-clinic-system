'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TreatmentForm from '@/components/TreatmentForm'
import TreatmentList from '@/components/TreatmentList'
import InvoiceActions from '@/components/InvoiceActions'
import DrugForm from '@/components/DrugForm'
import PrescriptionList from '@/components/PrescriptionList'
import SharePatientFolder from '@/components/SharePatientFolder'

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [patientId, setPatientId] = useState<string | null>(null)
  const [data, setData] = useState<any>({
    patient: null,
    treatments: [],
    invoices: [],
    prescriptions: [],
    clinic: null,
    currentUser: null,
    isDoctor: false,
    isReceptionist: false
  })
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Get params and load data
  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params
      setPatientId(id)
      loadData(id)
    }
    loadParams()
  }, [params])

  async function loadData(id: string) {
    setLoading(true)
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    // Get current user from database
    const { data: currentUser } = await supabase
      .from('users')
      .select('role, clinic_id, first_name, last_name, id')
      .eq('email', session.user.email)
      .single()

    // Fetch patient
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!patient) {
      setLoading(false)
      setData((prev: any) => ({ ...prev, patient: null }))
      return
    }

    // Fetch treatments
    const { data: treatments } = await supabase
      .from('treatments')
      .select('*')
      .eq('patient_id', id)
      .order('created_at', { ascending: false })

    // Fetch invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('patient_id', id)
      .order('created_at', { ascending: false })

    // Fetch prescriptions
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select(`
        *,
        drugs (*),
        doctor:users!doctor_id (first_name, last_name)
      `)
      .eq('patient_id', id)
      .order('issued_date', { ascending: false })

    // Get clinic
    const { data: clinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', currentUser?.clinic_id)
      .single()

    setData({
      patient,
      treatments: treatments || [],
      invoices: invoices || [],
      prescriptions: prescriptions || [],
      clinic,
      currentUser,
      isDoctor: currentUser?.role === 'doctor',
      isReceptionist: currentUser?.role === 'receptionist'
    })
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const tabs = [
    { id: 'info', label: '📋 Patient Info', icon: '👤' },
    { id: 'treatment', label: '➕ Add Treatment', icon: '🦷', showOnly: 'doctor' },
    { id: 'history', label: '📋 Treatment History', icon: '📜' },
    { id: 'prescriptions', label: '💊 Prescriptions', icon: '💊' },
    { id: 'invoices', label: '💰 Invoices', icon: '💰' }
  ]

  const visibleTabs = tabs.filter(tab => {
    if (tab.showOnly === 'doctor') return data.isDoctor
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-500">Loading patient data...</p>
        </div>
      </div>
    )
  }

  if (!data.patient) {
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

  const patient = data.patient

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
              {data.isReceptionist && (
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
        {/* Patient Information Card - Always visible */}
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

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-1 px-4 pt-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span>{tab.icon || tab.label.charAt(0)}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Patient Info Tab */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Contact Information</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm"><strong>Phone:</strong> {patient.phone || 'N/A'}</p>
                      <p className="text-sm mt-1"><strong>Email:</strong> {patient.email || 'N/A'}</p>
                      <p className="text-sm mt-1"><strong>Address:</strong> {patient.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Medical Summary</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm"><strong>Total Treatments:</strong> {data.treatments?.length || 0}</p>
                      <p className="text-sm mt-1"><strong>Total Prescriptions:</strong> {data.prescriptions?.length || 0}</p>
                      <p className="text-sm mt-1"><strong>Total Invoices:</strong> {data.invoices?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Treatment Tab */}
            {activeTab === 'treatment' && data.isDoctor && (
              <div>
                <TreatmentForm patientId={patientId!} doctorId={data.currentUser?.id} />
              </div>
            )}

            {/* Treatment History Tab */}
            {activeTab === 'history' && (
              <div>
                <TreatmentList 
                  treatments={data.treatments || []} 
                  isDoctor={data.isDoctor} 
                  patientId={patientId!} 
                />
              </div>
            )}

            {/* Prescriptions Tab */}
            {activeTab === 'prescriptions' && (
              <div>
                {data.isDoctor && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-3">Issue New Prescription</h3>
                    <DrugForm 
                      patientId={patientId!} 
                      doctorId={data.currentUser?.id}
                    />
                  </div>
                )}
                <PrescriptionList patientId={patientId!} />
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div>
                {data.invoices && data.invoices.length > 0 ? (
                  <div className="space-y-4">
                    {data.invoices.map((invoice: any) => {
                      const grandTotal = invoice.grand_total || invoice.total || 0
                      const doctorName = data.currentUser?.first_name || 'Staff'
                      
                      return (
                        <div key={invoice.id} className="border rounded-lg p-4 hover:bg-gray-50">
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
                                clinic={data.clinic}
                                doctorName={doctorName}
                                treatments={data.treatments?.filter((t: any) => invoice.treatment_ids?.includes(t.id)) || []}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-2">💰</p>
                    <p>No invoices found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Share PDF Button */}
        <div className="mt-6 flex justify-end">
          <SharePatientFolder 
            patient={patient}
            treatments={data.treatments || []}
            prescriptions={data.prescriptions || []}
            invoices={data.invoices || []}
          />
        </div>
      </main>
    </div>
  )
}