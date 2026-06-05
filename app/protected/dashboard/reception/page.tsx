import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InvoiceList from '@/components/InvoiceList'

export default async function ReceptionDashboard() {
  const supabase = await createClient()
  
  // Use getUser() for secure authentication
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) {
    redirect('/login')
  }

  // Get user info from database
  const { data: dbUser } = await supabase
    .from('users')
    .select('*, clinics(*)')
    .eq('email', authUser.email)
    .single()

  // If not a receptionist, redirect to doctor
  if (dbUser?.role !== 'receptionist' && dbUser?.role !== 'owner') {
    redirect('/protected/dashboard/doctor')
  }

  const clinic = dbUser?.clinics
  const today = new Date().toISOString().split('T')[0]
  
  // Get today's date in readable format
  const todayFormatted = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Fetch today's appointments
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
    .eq('date', today)
    .order('time', { ascending: true })

  // Fetch upcoming appointments (next 7 days)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]
  
  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (
        id,
        first_name,
        last_name,
        phone
      )
    `)
    .gte('date', today)
    .lte('date', nextWeekStr)
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .limit(10)

  // Fetch recent patients (last 7 days)
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)
  const lastWeekStr = lastWeek.toISOString().split('T')[0]
  
  const { data: recentPatients } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinic?.id)
    .gte('created_at', lastWeekStr)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch counts for stats
  const { count: todayCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)
    .eq('clinic_id', clinic?.id)

  const { count: totalPatients } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinic?.id)

  const { count: upcomingCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled')
    .gte('date', today)
    .eq('clinic_id', clinic?.id)

  // Fetch pending invoices with patient details
  const { data: pendingInvoices } = await supabase
    .from('invoices')
    .select(`
      *,
      patients (
        id,
        first_name,
        last_name,
        phone
      )
    `)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })

  // Fetch recent paid invoices
  const { data: paidInvoices } = await supabase
    .from('invoices')
    .select(`
      *,
      patients (
        id,
        first_name,
        last_name
      )
    `)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(10)

  // Calculate total pending amount
  const totalPendingAmount = pendingInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md border-b-4 border-green-500 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-green-600">
                💼 {clinic?.name || 'Dental Clinic'} - Reception Portal
              </h1>
              <p className="text-sm text-gray-500 mt-1">{todayFormatted}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">
                  {dbUser?.first_name} {dbUser?.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{dbUser?.role}</p>
              </div>
              <form action="/api/auth/logout" method="post">
                <button className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm font-medium">
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 border-green-200 rounded-xl shadow-sm p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Patients</p>
                <p className="text-3xl font-bold mt-1">{todayCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Scheduled today</p>
              </div>
              <div className="text-4xl text-green-600">👥</div>
            </div>
          </div>

          <div className="bg-blue-50 border-blue-200 rounded-xl shadow-sm p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold mt-1">{totalPatients || 0}</p>
                <p className="text-xs text-gray-500 mt-1">In the system</p>
              </div>
              <div className="text-4xl text-blue-600">📋</div>
            </div>
          </div>

          <div className="bg-yellow-50 border-yellow-200 rounded-xl shadow-sm p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold mt-1">{upcomingCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
              </div>
              <div className="text-4xl text-yellow-600">📅</div>
            </div>
          </div>

          <div className="bg-purple-50 border-purple-200 rounded-xl shadow-sm p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                <p className="text-3xl font-bold mt-1">{pendingInvoices?.length || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
              </div>
              <div className="text-4xl text-purple-600">💰</div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar - Fixed: patients is OUTSIDE protected folder */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex flex-wrap gap-3">
            <Link 
              href="/patients/new" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              ➕ Register New Patient
            </Link>
            <Link 
              href="/appointments/new" 
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              📅 Schedule Appointment
            </Link>
            <Link 
              href="/patients" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              🔍 Find Patient
            </Link>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Today's Schedule */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                <span>📅</span> Today's Schedule
              </h2>
            </div>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {appointments && appointments.length > 0 ? (
                appointments.map((apt: any) => (
                  <div key={apt.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-gray-700">
                            {apt.time.slice(0,5)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                            apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {apt.status || 'scheduled'}
                          </span>
                        </div>
                        <div className="font-medium text-gray-900 mt-1">
                          {apt.patients?.first_name} {apt.patients?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{apt.type}</div>
                        {apt.patients?.phone && (
                          <div className="text-xs text-gray-400 mt-1">📞 {apt.patients?.phone}</div>
                        )}
                      </div>
                      <Link 
                        href={`/patients/${apt.patients?.id}`}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">😊</div>
                  <p>No appointments scheduled for today</p>
                  <Link href="/appointments/new" className="text-green-600 text-sm mt-2 inline-block">
                    + Schedule an appointment
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Upcoming & Recent */}
          <div className="space-y-6">
            
            {/* Upcoming Appointments */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                  <span>⏰</span> Upcoming Appointments (Next 7 Days)
                </h2>
              </div>
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {upcomingAppointments && upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((apt: any) => {
                    const date = new Date(apt.date)
                    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    return (
                      <div key={apt.id} className="p-3 hover:bg-gray-50 transition">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-600">{formattedDate}</div>
                            <div className="font-medium text-gray-900">
                              {apt.patients?.first_name} {apt.patients?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{apt.time.slice(0,5)} - {apt.type}</div>
                          </div>
                          <Link 
                            href={`/appointments/${apt.id}/edit`}
                            className="text-blue-600 text-sm"
                          >
                            Manage →
                          </Link>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No upcoming appointments
                  </div>
                )}
              </div>
            </div>

            {/* Recent Patient Registrations */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
                <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                  <span>🆕</span> New Patients (Last 7 Days)
                </h2>
              </div>
              <div className="divide-y max-h-[250px] overflow-y-auto">
                {recentPatients && recentPatients.length > 0 ? (
                  recentPatients.map((patient: any) => {
                    const date = new Date(patient.created_at)
                    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return (
                      <div key={patient.id} className="p-3 hover:bg-gray-50 transition">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">
                              {patient.first_name} {patient.last_name}
                            </div>
                            {patient.phone && (
                              <div className="text-xs text-gray-500">📞 {patient.phone}</div>
                            )}
                            <div className="text-xs text-gray-400">Registered {formattedDate}</div>
                          </div>
                          <Link 
                            href={`/patients/${patient.id}`}
                            className="text-blue-600 text-sm"
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No new patients this week
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Section - Using InvoiceList Component */}
        <div className="mt-6">
          <InvoiceList invoices={pendingInvoices || []} />
        </div>

        {/* Recent Paid Invoices */}
        {paidInvoices && paidInvoices.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
              <h2 className="font-semibold text-white text-lg">✅ Recent Payments</h2>
            </div>
            <div className="divide-y">
              {paidInvoices.map((invoice: any) => (
                <div key={invoice.id} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">#{invoice.invoice_number}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        {invoice.patients?.first_name} {invoice.patients?.last_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-600 font-semibold">${invoice.total?.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}