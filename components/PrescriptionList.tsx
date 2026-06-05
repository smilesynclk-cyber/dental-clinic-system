'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'

export default function PrescriptionList({ patientId }: { patientId: string }) {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    fetchPrescriptions()
  }, [patientId])

  async function fetchPrescriptions() {
    setLoading(true)
    
    const { data, error } = await supabase
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
      .eq('patient_id', patientId)
      .order('issued_date', { ascending: false })

    if (error) {
      console.error('Error fetching prescriptions:', error)
    } else {
      setPrescriptions(data || [])
    }
    setLoading(false)
  }

  // Don't render anything until mounted on client
  if (!isMounted) {
    return <div className="py-4"></div>
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading prescriptions...</p>
      </div>
    )
  }

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg mb-2">💊</p>
        <p>No prescriptions issued yet</p>
        <p className="text-sm mt-1">Click "Issue Prescription" above to add medications</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <div key={prescription.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-purple-700 text-lg">
                  {prescription.drugs?.name}
                </span>
                <span className="text-sm text-gray-500">
                  {prescription.drugs?.strength}
                </span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {prescription.drugs?.dosage_form}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                <div>
                  <span className="text-gray-500">Dosage:</span>
                  <p className="font-medium">{prescription.dosage}</p>
                </div>
                <div>
                  <span className="text-gray-500">Frequency:</span>
                  <p className="font-medium">{prescription.frequency}</p>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <p className="font-medium">{prescription.duration}</p>
                </div>
                <div>
                  <span className="text-gray-500">Quantity:</span>
                  <p className="font-medium">{prescription.quantity}</p>
                </div>
              </div>
              
              {prescription.instructions && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Instructions:</span>
                  <p className="text-gray-700">{prescription.instructions}</p>
                </div>
              )}
              
              <div className="mt-3 text-xs text-gray-400 flex gap-3 flex-wrap">
                <span>Issued: {new Date(prescription.issued_date).toLocaleDateString()}</span>
                <span>By: Dr. {prescription.doctor?.first_name} {prescription.doctor?.last_name}</span>
                <span className={`px-2 py-0.5 rounded-full ${
                  prescription.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {prescription.status === 'active' ? 'Active' : 'Completed'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}