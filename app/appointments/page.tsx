import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AppointmentsPage() {
  const supabase = await createClient()
  
  // Use getUser() for secure authentication
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Get user role
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('email', authUser.email)
    .single()

  // Get date filter from URL (default to today)
  const today = new Date().toISOString().split('T')[0]
  
  // Fetch appointments with patient details
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (
        id,
        first_name,
        last_name,
        phone,
        email
      )
    `)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  // Group appointments by date
  const groupedAppointments = appointments?.reduce((groups: any, apt: any) => {
    const date = apt.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(apt)
    return groups
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">📅 Appointments</h1>
              <p className="text-sm text-gray-500 mt-1">Manage patient appointments</p>
            </div>
            <Link 
              href="/appointments/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + New Appointment
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Appointments List */}
        <div className="space-y-6">
          {groupedAppointments && Object.keys(groupedAppointments).length > 0 ? (
            Object.entries(groupedAppointments).map(([date, dayAppointments]: [string, any]) => (
              <div key={date} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h2 className="font-semibold text-gray-700">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h2>
                </div>
                <div className="divide-y">
                  {dayAppointments.map((apt: any) => (
                    <AppointmentRow key={apt.id} appointment={apt} userRole={user?.role} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No appointments found</h3>
              <p className="text-gray-500 mb-4">Schedule your first appointment</p>
              <Link 
                href="/appointments/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block"
              >
                + New Appointment
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Appointment Row Component
function AppointmentRow({ appointment, userRole }: any) {
  const statusColors: any = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    'no-show': 'bg-orange-100 text-orange-800'
  }

  return (
    <div className="p-4 hover:bg-gray-50 transition">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-center min-w-[60px]">
            <div className="text-xl font-bold text-gray-700">
              {appointment.time.slice(0,5)}
            </div>
            <div className="text-xs text-gray-500">
              {appointment.duration_minutes || 30} min
            </div>
          </div>
          
          <div>
            <div className="font-medium text-gray-900">
              {appointment.patients?.first_name} {appointment.patients?.last_name}
            </div>
            <div className="text-sm text-gray-500">{appointment.type}</div>
            {appointment.patients?.phone && (
              <div className="text-xs text-gray-400">📞 {appointment.patients.phone}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[appointment.status]}`}>
            {appointment.status}
          </span>
          
          <Link
            href={`/appointments/${appointment.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View Details
          </Link>
          
          {(userRole === 'receptionist' || userRole === 'owner') && (
            <Link
              href={`/appointments/${appointment.id}/edit`}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}