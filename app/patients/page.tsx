import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PatientsPage() {
  const supabase = await createClient()
  
  // Use getUser() for secure authentication
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Get current user from database
  const { data: dbUser } = await supabase
    .from('users')
    .select('clinic_id')
    .eq('email', authUser.email)
    .single()

  // If user has no clinic_id, try to get first clinic
  let clinicId = dbUser?.clinic_id
  
  if (!clinicId) {
    const { data: firstClinic } = await supabase
      .from('clinics')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    if (firstClinic) {
      clinicId = firstClinic.id
      // Update user with clinic_id
      await supabase
        .from('users')
        .update({ clinic_id: clinicId })
        .eq('email', authUser.email)
    }
  }

  // Fetch patients for this clinic
  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">👥 Patients</h1>
              <p className="text-sm text-gray-500 mt-1">Manage patient records</p>
            </div>
            <Link 
              href="/patients/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Register New Patient
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {patients && patients.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {patients.map((patient: any) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">
                      {patient.first_name} {patient.last_name}
                    </td>
                    <td className="px-6 py-4">{patient.phone || '-'}</td>
                    <td className="px-6 py-4">{patient.email || '-'}</td>
                    <td className="px-6 py-4">
                      {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/patients/${patient.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients yet</h3>
              <p className="text-gray-500 mb-4">Register your first patient to get started.</p>
              <Link 
                href="/patients/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block"
              >
                + Register New Patient
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}