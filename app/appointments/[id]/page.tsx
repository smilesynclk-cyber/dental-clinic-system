import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch appointment details
  const { data: appointment } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (*),
      clinic:clinics (*)
    `)
    .eq('id', params.id)
    .single()

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Appointment not found</h1>
        <Link href="/appointments" className="text-blue-600 mt-4 inline-block">
          ← Back to Appointments
        </Link>
      </div>
    )
  }

  const statusColors: any = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    'no-show': 'bg-orange-100 text-orange-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/appointments" className="text-blue-600 text-sm mb-2 inline-block">
            ← Back to Appointments
          </Link>
          <h1 className="text-2xl font-bold text-blue-600">Appointment Details</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header with Status */}
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-500">Appointment ID</div>
                <div className="font-mono text-sm">{appointment.id.slice(0,8)}...</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[appointment.status]}`}>
                {appointment.status}
              </span>
            </div>
          </div>

          {/* Patient Information */}
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Patient Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium">
                  {appointment.patients?.first_name} {appointment.patients?.last_name}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="font-medium">{appointment.patients?.phone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{appointment.patients?.email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Date of Birth</div>
                <div className="font-medium">{appointment.patients?.date_of_birth || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold mb-3">Appointment Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Date</div>
                <div className="font-medium">
                  {new Date(appointment.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Time</div>
                <div className="font-medium">{appointment.time.slice(0,5)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Type</div>
                <div className="font-medium">{appointment.type}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div className="font-medium">{appointment.duration_minutes || 30} minutes</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Room Number</div>
                <div className="font-medium">{appointment.room_number || 'Not assigned'}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold mb-3">Notes</h2>
              <div className="bg-gray-50 p-3 rounded-lg">
                {appointment.notes}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 py-4 flex gap-3">
            <Link
              href={`/appointments/${appointment.id}/edit`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Edit Appointment
            </Link>
            <Link
              href={`/patients/${appointment.patient_id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              View Patient Profile
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}