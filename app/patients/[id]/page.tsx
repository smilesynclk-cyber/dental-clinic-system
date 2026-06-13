'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TreatmentForm from '@/components/TreatmentForm'
import TreatmentList from '@/components/TreatmentList'
import InvoiceActions from '@/components/InvoiceActions'
import SharePatientFolder from '@/components/SharePatientFolder'
import Image from 'next/image'

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
    isReceptionist: false,
    allergies: [],
    medicalConditions: []
  })
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
  const [selectedDrugs, setSelectedDrugs] = useState<any[]>([])
  const [availableDrugs, setAvailableDrugs] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [prescriptionNote, setPrescriptionNote] = useState('')
  const [generatingPDF, setGeneratingPDF] = useState(false)
  
  // New state for allergies and conditions
  const [showAllergyForm, setShowAllergyForm] = useState(false)
  const [showConditionForm, setShowConditionForm] = useState(false)
  const [newAllergy, setNewAllergy] = useState({ allergen: '', severity: 'moderate', reaction: '', notes: '' })
  const [newCondition, setNewCondition] = useState({ condition: '', diagnosis_date: '', status: 'active', notes: '' })
  
  const router = useRouter()
  const supabase = createClient()

  // Get params and load data
  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params
      setPatientId(id)
      await loadData(id)
      await loadDrugs()
    }
    loadParams()
  }, [params])

  async function loadData(id: string) {
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('role, clinic_id, first_name, last_name, id')
        .eq('email', session.user.email)
        .single()

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

      const { data: treatments } = await supabase
        .from('treatments')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })

      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })

      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select(`
          *,
          drugs (*),
          doctor:users!doctor_id (first_name, last_name)
        `)
        .eq('patient_id', id)
        .order('issued_date', { ascending: false })

      const { data: clinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', currentUser?.clinic_id)
        .single()

      // Load allergies and medical conditions
      const { data: allergies } = await supabase
        .from('patient_allergies')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })

      const { data: medicalConditions } = await supabase
        .from('patient_medical_conditions')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })

      setData({
        patient,
        treatments: treatments || [],
        invoices: invoices || [],
        prescriptions: prescriptions || [],
        clinic,
        currentUser,
        isDoctor: currentUser?.role === 'doctor',
        isReceptionist: currentUser?.role === 'receptionist',
        allergies: allergies || [],
        medicalConditions: medicalConditions || []
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadDrugs() {
    try {
      const { data } = await supabase
        .from('drugs')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setAvailableDrugs(data || [])
    } catch (error) {
      console.error('Error loading drugs:', error)
    }
  }

  // Check for drug allergies before prescribing
  const checkDrugAllergies = (drug: any) => {
    if (!data.allergies || data.allergies.length === 0) return false
    
    return data.allergies.some((allergy: any) => 
      drug.name?.toLowerCase().includes(allergy.allergen?.toLowerCase()) ||
      allergy.allergen?.toLowerCase().includes(drug.name?.toLowerCase()) ||
      (drug.category && drug.category.toLowerCase().includes(allergy.allergen?.toLowerCase()))
    )
  }

  const addDrugToPrescription = (drug: any) => {
    // Check for allergies before adding
    const hasAllergy = checkDrugAllergies(drug)

    if (hasAllergy) {
      const allergicDrugs = data.allergies.filter((a: any) => 
        drug.name?.toLowerCase().includes(a.allergen?.toLowerCase()) ||
        a.allergen?.toLowerCase().includes(drug.name?.toLowerCase())
      )
      
      if (!confirm(`⚠️ ALLERGY WARNING: ${drug.name} may cause allergic reaction.\n\nPatient is allergic to: ${allergicDrugs.map((a: any) => a.allergen).join(', ')}\n\nAre you sure you want to prescribe this medication?`)) {
        return
      }
    }

    setSelectedDrugs([...selectedDrugs, {
      ...drug,
      dosage: '',
      frequency: '',
      duration: ''
    }])
    setSearchTerm('')
  }

  async function savePrescription() {
    if (selectedDrugs.length === 0) {
      alert('Please add at least one drug to the prescription')
      return
    }

    // Final allergy check before saving
    for (const drug of selectedDrugs) {
      const hasAllergy = checkDrugAllergies(drug)
      
      if (hasAllergy) {
        if (!confirm(`⚠️ ALLERGY ALERT: Patient is allergic to a medication similar to ${drug.name}. Continue anyway?`)) {
          return
        }
      }
    }

    setLoading(true)

    try {
      for (const drug of selectedDrugs) {
        const { error } = await supabase
          .from('prescriptions')
          .insert({
            patient_id: patientId,
            doctor_id: data.currentUser?.id,
            drug_id: drug.id,
            dosage: drug.dosage,
            frequency: drug.frequency,
            duration: drug.duration,
            quantity: 1,
            instructions: prescriptionNote,
            status: 'active',
            issued_date: new Date().toISOString()
          })

        if (error) throw error
      }

      alert(`✓ Prescription issued with ${selectedDrugs.length} medication(s)!`)
      setSelectedDrugs([])
      setPrescriptionNote('')
      setShowPrescriptionForm(false)
      await loadData(patientId!)
    } catch (error: any) {
      console.error('Error saving prescription:', error)
      alert('Error saving prescription: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Add new allergy
  async function addAllergy(e: React.FormEvent) {
    e.preventDefault()
    if (!newAllergy.allergen) {
      alert('Please enter the allergen name')
      return
    }

    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('patient_allergies')
        .insert({
          patient_id: patientId,
          allergen: newAllergy.allergen,
          severity: newAllergy.severity,
          reaction: newAllergy.reaction || null,
          notes: newAllergy.notes || null,
          created_by: data.currentUser?.id
        })

      if (error) throw error

      alert('✓ Allergy recorded successfully')
      setNewAllergy({ allergen: '', severity: 'moderate', reaction: '', notes: '' })
      setShowAllergyForm(false)
      await loadData(patientId!)
    } catch (error: any) {
      console.error('Error adding allergy:', error)
      alert('Error adding allergy: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Add new medical condition
  async function addMedicalCondition(e: React.FormEvent) {
    e.preventDefault()
    if (!newCondition.condition) {
      alert('Please enter the medical condition')
      return
    }

    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('patient_medical_conditions')
        .insert({
          patient_id: patientId,
          condition: newCondition.condition,
          diagnosis_date: newCondition.diagnosis_date || null,
          status: newCondition.status,
          notes: newCondition.notes || null,
          created_by: data.currentUser?.id
        })

      if (error) throw error

      alert('✓ Medical condition recorded successfully')
      setNewCondition({ condition: '', diagnosis_date: '', status: 'active', notes: '' })
      setShowConditionForm(false)
      await loadData(patientId!)
    } catch (error: any) {
      console.error('Error adding medical condition:', error)
      alert('Error adding medical condition: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Delete allergy
  async function deleteAllergy(allergyId: string) {
    if (!confirm('Are you sure you want to remove this allergy record?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('patient_allergies')
        .delete()
        .eq('id', allergyId)

      if (error) throw error
      
      await loadData(patientId!)
    } catch (error: any) {
      console.error('Error deleting allergy:', error)
      alert('Error deleting allergy: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Delete medical condition
  async function deleteCondition(conditionId: string) {
    if (!confirm('Are you sure you want to remove this medical condition?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('patient_medical_conditions')
        .delete()
        .eq('id', conditionId)

      if (error) throw error
      
      await loadData(patientId!)
    } catch (error: any) {
      console.error('Error deleting condition:', error)
      alert('Error deleting condition: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function updateDrugField(index: number, field: string, value: string) {
    const updated = [...selectedDrugs]
    updated[index][field] = value
    setSelectedDrugs(updated)
  }

  function removeDrugFromPrescription(index: number) {
    const updated = [...selectedDrugs]
    updated.splice(index, 1)
    setSelectedDrugs(updated)
  }

  // Function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 'N/A'
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'severe': return 'bg-red-100 text-red-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'mild': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-yellow-100 text-yellow-800'
      case 'chronic': return 'bg-orange-100 text-orange-800'
      case 'inactive': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const generatePrintablePrescription = () => {
    setGeneratingPDF(true)
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow pop-ups to print prescription')
      setGeneratingPDF(false)
      return
    }

    const today = new Date()
    const prescriptionsList = data.prescriptions || []
    const patientAge = calculateAge(data.patient?.date_of_birth)
    const logoPath = '/logo.png'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${data.patient?.first_name} ${data.patient?.last_name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .prescription {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #0f5e8c 0%, #1a7fb3 100%);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
          }
          .logo-container {
            margin-bottom: 15px;
          }
          .logo {
            max-width: 80px;
            height: auto;
            border-radius: 50%;
            background: white;
            padding: 5px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0 0;
            opacity: 0.9;
          }
          .content {
            padding: 30px;
          }
          .patient-info {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #0f5e8c;
          }
          .patient-info h3 {
            margin: 0 0 10px 0;
            color: #0f5e8c;
          }
          .patient-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          .allergy-warning {
            background: #fee2e2;
            border-left: 4px solid #dc2626;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
          }
          .allergy-warning h4 {
            color: #dc2626;
            margin: 0 0 5px 0;
          }
          .doctor-info {
            text-align: right;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #ccc;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: #e0f2fe;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #0f5e8c;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          .doctor-signature {
            margin-top: 40px;
            display: flex;
            justify-content: flex-end;
          }
          .signature-line {
            text-align: center;
            width: 250px;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .prescription {
              box-shadow: none;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="prescription">
          <div class="header">
            <div class="logo-container">
              <img src="${logoPath}" alt="Finest Dental Care" class="logo" onerror="this.style.display='none'">
            </div>
            <h1>Finest Dental Care</h1>
            <p>Dental Prescription</p>
          </div>
          
          <div class="content">
            <div class="doctor-info">
              <p><strong>Dr. ${data.currentUser?.first_name} ${data.currentUser?.last_name}</strong></p>
              <p>License No: DEN-${Math.floor(Math.random() * 10000)}</p>
              <p>Date: ${today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div class="patient-info">
              <h3>Patient Information</h3>
              <p><strong>Name:</strong> ${data.patient?.first_name} ${data.patient?.last_name}</p>
              <p><strong>Age:</strong> ${patientAge} years</p>
              ${data.patient?.date_of_birth ? `<p><strong>Date of Birth:</strong> ${new Date(data.patient.date_of_birth).toLocaleDateString()}</p>` : ''}
              ${data.patient?.phone ? `<p><strong>Contact:</strong> ${data.patient.phone}</p>` : ''}
            </div>
            
            ${data.allergies && data.allergies.length > 0 ? `
              <div class="allergy-warning">
                <h4>⚠️ Allergy Alert</h4>
                ${data.allergies.map((a: any) => `<p><strong>${a.allergen}</strong> (${a.severity}): ${a.reaction || 'No reaction specified'}</p>`).join('')}
              </div>
            ` : ''}
            
            <h3>Medications Prescribed</h3>
            <table>
              <thead>
                <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Notes</th></tr>
              </thead>
              <tbody>
                ${prescriptionsList.map((p: any) => `
                  <tr>
                    <td><strong>${p.drugs?.name}</strong><br><small>${p.drugs?.strength || ''}</small></td>
                    <td>${p.dosage}</td>
                    <td>${p.frequency}</td>
                    <td>${p.duration}</td>
                    <td>${p.instructions || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${prescriptionNote ? `<p><strong>Special Instructions:</strong> ${prescriptionNote}</p>` : ''}
            
            <div class="doctor-signature">
              <div class="signature-line">
                <p>_____________________</p>
                <p>Dr. ${data.currentUser?.first_name} ${data.currentUser?.last_name}</p>
                <p style="font-size: 12px; color: #666;">(Authorized Signature)</p>
              </div>
            </div>
            
            <div class="footer">
              <p>${data.clinic?.address || '446/3, Third Lane, Nawala Rd, 10107'}</p>
              <p>📞 ${data.clinic?.phone || '+94 77 288 6121'} | ✉️ ${data.clinic?.email || 'contact@finestdentalcare.lk'}</p>
            </div>
          </div>
        </div>
        <div class="no-print" style="text-align:center; margin-top:20px;">
          <button onclick="window.print()" style="padding:10px 20px; background:#0f5e8c; color:white; border:none; border-radius:5px; cursor:pointer;">🖨️ Print Prescription</button>
          <button onclick="window.close()" style="padding:10px 20px; background:#6b7280; color:white; border:none; border-radius:5px; cursor:pointer; margin-left:10px;">❌ Close</button>
        </div>
        <script>
          window.print();
        </script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setGeneratingPDF(false)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const filteredDrugs = availableDrugs.filter(drug =>
    drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (drug.category && drug.category.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const tabs = [
    { id: 'info', label: '📋 Patient Info', icon: '👤' },
    { id: 'allergies', label: '⚠️ Allergies & Conditions', icon: '⚠️' },
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
  const patientAge = calculateAge(patient.date_of_birth)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
        {/* Allergy Warning Banner */}
        {data.allergies && data.allergies.length > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Allergy Alert</h3>
                <div className="mt-1 text-sm text-red-700">
                  {data.allergies.map((allergy: any, idx: number) => (
                    <div key={idx}>
                      <strong>{allergy.allergen}</strong> ({allergy.severity}){allergy.reaction && ` - ${allergy.reaction}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient Information Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3">
            <h2 className="text-white font-semibold text-lg">📋 Patient Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><p className="text-sm text-gray-500">Full Name</p><p className="font-medium">{patient.first_name} {patient.last_name}</p></div>
              <div><p className="text-sm text-gray-500">Age</p><p className="font-medium">{patientAge} years</p></div>
              <div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{patient.phone || 'N/A'}</p></div>
              <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{patient.email || 'N/A'}</p></div>
              <div><p className="text-sm text-gray-500">Date of Birth</p><p className="font-medium">{formatDate(patient.date_of_birth)}</p></div>
            </div>
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
                  className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition flex items-center gap-2 ${
                    activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span><span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Patient Info Tab */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Contact Information</h3>
                  <p><strong>Phone:</strong> {patient.phone || 'N/A'}</p>
                  <p><strong>Email:</strong> {patient.email || 'N/A'}</p>
                  <p><strong>Address:</strong> {patient.address || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Medical Summary</h3>
                  <p><strong>Total Treatments:</strong> {data.treatments?.length || 0}</p>
                  <p><strong>Total Prescriptions:</strong> {data.prescriptions?.length || 0}</p>
                  <p><strong>Total Invoices:</strong> {data.invoices?.length || 0}</p>
                  <p><strong>Known Allergies:</strong> {data.allergies?.length || 0}</p>
                  <p><strong>Medical Conditions:</strong> {data.medicalConditions?.length || 0}</p>
                </div>
              </div>
            )}

            {/* Allergies & Medical Conditions Tab */}
            {activeTab === 'allergies' && (
              <div className="space-y-6">
                {/* Allergies Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">⚠️ Known Allergies</h3>
                    {data.isDoctor && !showAllergyForm && (
                      <button
                        onClick={() => setShowAllergyForm(true)}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                      >
                        + Add Allergy
                      </button>
                    )}
                  </div>

                  {/* Add Allergy Form */}
                  {showAllergyForm && (
                    <form onSubmit={addAllergy} className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-semibold mb-3">Record New Allergy</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Allergen *</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newAllergy.allergen}
                            onChange={(e) => setNewAllergy({...newAllergy, allergen: e.target.value})}
                            placeholder="e.g., Penicillin, Codeine, Latex"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Severity</label>
                          <select
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newAllergy.severity}
                            onChange={(e) => setNewAllergy({...newAllergy, severity: e.target.value})}
                          >
                            <option value="mild">Mild</option>
                            <option value="moderate">Moderate</option>
                            <option value="severe">Severe</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Reaction</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newAllergy.reaction}
                            onChange={(e) => setNewAllergy({...newAllergy, reaction: e.target.value})}
                            placeholder="e.g., Rash, Swelling, Difficulty breathing"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Notes</label>
                          <textarea
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newAllergy.notes}
                            onChange={(e) => setNewAllergy({...newAllergy, notes: e.target.value})}
                            placeholder="Additional details about the allergic reaction..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                          Save Allergy
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAllergyForm(false)}
                          className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Allergies List */}
                  {data.allergies && data.allergies.length > 0 ? (
                    <div className="space-y-2">
                      {data.allergies.map((allergy: any) => (
                        <div key={allergy.id} className="border rounded-lg p-3 bg-white">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-red-800">{allergy.allergen}</div>
                              <div className="text-sm mt-1">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs ${getSeverityColor(allergy.severity)}`}>
                                  {allergy.severity}
                                </span>
                                {allergy.reaction && <span className="ml-2 text-gray-600">Reaction: {allergy.reaction}</span>}
                              </div>
                              {allergy.notes && <p className="text-sm text-gray-500 mt-1">{allergy.notes}</p>}
                              <p className="text-xs text-gray-400 mt-1">Recorded: {formatDate(allergy.created_at)}</p>
                            </div>
                            {data.isDoctor && (
                              <button
                                onClick={() => deleteAllergy(allergy.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No known allergies recorded</p>
                  )}
                </div>

                {/* Medical Conditions Section */}
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">🏥 Medical Conditions</h3>
                    {data.isDoctor && !showConditionForm && (
                      <button
                        onClick={() => setShowConditionForm(true)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700"
                      >
                        + Add Condition
                      </button>
                    )}
                  </div>

                  {/* Add Condition Form */}
                  {showConditionForm && (
                    <form onSubmit={addMedicalCondition} className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold mb-3">Record Medical Condition</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Condition *</label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newCondition.condition}
                            onChange={(e) => setNewCondition({...newCondition, condition: e.target.value})}
                            placeholder="e.g., Diabetes, Hypertension, Asthma"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Diagnosis Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newCondition.diagnosis_date}
                            onChange={(e) => setNewCondition({...newCondition, diagnosis_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Status</label>
                          <select
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newCondition.status}
                            onChange={(e) => setNewCondition({...newCondition, status: e.target.value})}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive / Resolved</option>
                            <option value="chronic">Chronic</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Notes</label>
                          <textarea
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg"
                            value={newCondition.notes}
                            onChange={(e) => setNewCondition({...newCondition, notes: e.target.value})}
                            placeholder="Additional details about the condition..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                          Save Condition
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConditionForm(false)}
                          className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Medical Conditions List */}
                  {data.medicalConditions && data.medicalConditions.length > 0 ? (
                    <div className="space-y-2">
                      {data.medicalConditions.map((condition: any) => (
                        <div key={condition.id} className="border rounded-lg p-3 bg-white">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-blue-800">{condition.condition}</div>
                              <div className="text-sm mt-1">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs ${getStatusColor(condition.status)}`}>
                                  {condition.status}
                                </span>
                                {condition.diagnosis_date && (
                                  <span className="ml-2 text-gray-600">Diagnosed: {formatDate(condition.diagnosis_date)}</span>
                                )}
                              </div>
                              {condition.notes && <p className="text-sm text-gray-500 mt-1">{condition.notes}</p>}
                              <p className="text-xs text-gray-400 mt-1">Recorded: {formatDate(condition.created_at)}</p>
                            </div>
                            {data.isDoctor && (
                              <button
                                onClick={() => deleteCondition(condition.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No medical conditions recorded</p>
                  )}
                </div>
              </div>
            )}

            {/* Add Treatment Tab */}
            {activeTab === 'treatment' && data.isDoctor && (
              <TreatmentForm patientId={patientId!} doctorId={data.currentUser?.id} />
            )}

            {/* Treatment History Tab */}
            {activeTab === 'history' && (
              <TreatmentList treatments={data.treatments || []} isDoctor={data.isDoctor} patientId={patientId!} />
            )}

            {/* Prescriptions Tab */}
            {activeTab === 'prescriptions' && (
              <div>
                {/* Printable Prescription Button */}
                {data.prescriptions && data.prescriptions.length > 0 && (
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={generatePrintablePrescription}
                      disabled={generatingPDF}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <span>📄</span> Generate Printable Prescription
                    </button>
                  </div>
                )}

                {/* Add Prescription Button */}
                {data.isDoctor && !showPrescriptionForm && (
                  <button
                    onClick={() => setShowPrescriptionForm(true)}
                    className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    + New Prescription (Multiple Drugs)
                  </button>
                )}

                {/* Prescription Form */}
                {showPrescriptionForm && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-semibold mb-3">Issue New Prescription</h3>
                    
                    {/* Drug Search */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Search & Add Drugs</label>
                      <input
                        type="text"
                        placeholder="Search by drug name..."
                        className="w-full border rounded-lg p-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && filteredDrugs.length > 0 && (
                        <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                          {filteredDrugs.map(drug => {
                            const hasAllergy = checkDrugAllergies(drug)
                            return (
                              <div
                                key={drug.id}
                                className={`p-2 hover:bg-gray-100 cursor-pointer border-b ${hasAllergy ? 'bg-red-50' : ''}`}
                                onClick={() => addDrugToPrescription(drug)}
                              >
                                <div className="font-medium">
                                  {drug.name} 
                                  {hasAllergy && <span className="text-red-500 text-xs ml-2">⚠️ Allergy Risk</span>}
                                </div>
                                <div className="text-xs text-gray-500">{drug.strength} | {drug.dosage_form}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selected Drugs List */}
                    {selectedDrugs.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Prescribed Medications</label>
                        <div className="space-y-3">
                          {selectedDrugs.map((drug, idx) => {
                            const hasAllergy = checkDrugAllergies(drug)
                            return (
                              <div key={idx} className={`border rounded-lg p-3 ${hasAllergy ? 'bg-red-50 border-red-300' : 'bg-white'}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="font-medium">{drug.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">{drug.strength}</span>
                                    {hasAllergy && <span className="text-red-500 text-xs ml-2">⚠️ Allergy Warning</span>}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeDrugFromPrescription(idx)}
                                    className="text-red-500 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Dosage (e.g., 1 tablet)"
                                    className="border rounded p-1 text-sm"
                                    value={drug.dosage}
                                    onChange={(e) => updateDrugField(idx, 'dosage', e.target.value)}
                                  />
                                  <select
                                    className="border rounded p-1 text-sm"
                                    value={drug.frequency}
                                    onChange={(e) => updateDrugField(idx, 'frequency', e.target.value)}
                                  >
                                    <option value="">Frequency</option>
                                    <option value="Once daily">Once daily</option>
                                    <option value="Twice daily">Twice daily</option>
                                    <option value="Three times daily">Three times daily</option>
                                    <option value="Four times daily">Four times daily</option>
                                    <option value="Every 4 hours">Every 4 hours</option>
                                    <option value="Every 6 hours">Every 6 hours</option>
                                    <option value="Every 8 hours">Every 8 hours</option>
                                    <option value="As needed">As needed</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Duration (e.g., 5 days)"
                                    className="border rounded p-1 text-sm"
                                    value={drug.duration}
                                    onChange={(e) => updateDrugField(idx, 'duration', e.target.value)}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Additional Instructions</label>
                      <textarea
                        rows={2}
                        className="w-full border rounded-lg p-2"
                        placeholder="General instructions for all medications..."
                        value={prescriptionNote}
                        onChange={(e) => setPrescriptionNote(e.target.value)}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={savePrescription}
                        disabled={selectedDrugs.length === 0}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Save Prescription ({selectedDrugs.length} drug{selectedDrugs.length !== 1 ? 's' : ''})
                      </button>
                      <button
                        onClick={() => {
                          setShowPrescriptionForm(false)
                          setSelectedDrugs([])
                          setPrescriptionNote('')
                        }}
                        className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Prescriptions List */}
                <div className="space-y-4">
                  {data.prescriptions && data.prescriptions.length > 0 ? (
                    data.prescriptions.map((prescription: any) => {
                      const hasAllergy = checkDrugAllergies(prescription.drugs || {})
                      return (
                        <div key={prescription.id} className={`border rounded-lg p-4 hover:bg-gray-50 ${hasAllergy ? 'border-red-300 bg-red-50' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-lg">
                                {prescription.drugs?.name}
                                {hasAllergy && <span className="text-red-500 text-xs ml-2">⚠️ Allergy Warning</span>}
                              </div>
                              <div className="text-sm text-gray-600">
                                {prescription.drugs?.strength && `${prescription.drugs.strength} • `}
                                {prescription.dosage && `Dosage: ${prescription.dosage} • `}
                                {prescription.frequency && `Frequency: ${prescription.frequency}`}
                              </div>
                              {prescription.duration && (
                                <div className="text-sm text-gray-600">Duration: {prescription.duration}</div>
                              )}
                              {prescription.instructions && (
                                <div className="text-sm text-gray-500 mt-1">Note: {prescription.instructions}</div>
                              )}
                              <div className="text-xs text-gray-400 mt-2">
                                Issued by: Dr. {prescription.doctor?.first_name} {prescription.doctor?.last_name} • 
                                Date: {new Date(prescription.issued_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="ml-4">
                              <span className={`px-2 py-1 rounded text-xs ${
                                prescription.status === 'active' ? 'bg-green-100 text-green-800' :
                                prescription.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {prescription.status || 'active'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">No prescriptions found</div>
                  )}
                </div>
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
                              <div className="font-medium">Invoice #{invoice.invoice_number}</div>
                              <div className="text-sm text-gray-500">Date: {new Date(invoice.created_at).toLocaleDateString()}</div>
                              <div className="text-lg font-bold text-green-600 mt-1">Grand Total: ${grandTotal.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded text-xs ${
                                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {invoice.status === 'paid' ? '✓ Paid' : invoice.status === 'sent' ? '📨 Sent' : '📝 Draft'}
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
                  <div className="text-center py-8 text-gray-500">No invoices found</div>
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