import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InvoiceList from '@/components/InvoiceList'
import AppointmentCalendar from '@/components/AppointmentCalendar'
import TrialStatusCard from '@/components/TrialStatusCard'

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

  // Fetch trial info for the clinic
  let trialInfo = null
  if (clinic) {
    const { data: clinicData } = await supabase
      .from('clinics')
      .select('is_trial, trial_start_date, trial_end_date')
      .eq('id', clinic.id)
      .single()
    trialInfo = clinicData
  }

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
    .limit(8)

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
        {/* Trial Status Card - ADDED HERE */}
        <div className="mb-8">
          <TrialStatusCard initialTrialInfo={trialInfo} />
        </div>

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

        {/* Quick Actions Bar */}
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

        {/* Calendar View */}
        <div className="mb-8">
          <AppointmentCalendar clinicId={clinic?.id} />
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
            <h2 className="font-semibold text-white text-lg flex items-center gap-2">
              <span>🆕</span> New Patients (Last 7 Days)
            </h2>
          </div>
          <div className="divide-y max-h-[300px] overflow-y-auto">
            {recentPatients && recentPatients.length > 0 ? (
              recentPatients.map((patient: any) => {
                const date = new Date(patient.created_at)
                const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div key={patient.id} className="p-4 hover:bg-gray-50 transition">
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
                        className="text-blue-600 text-sm hover:underline"
                      >
                        View Profile →
                      </Link>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                No new patients this week
              </div>
            )}
          </div>
        </div>

        {/* Invoices Section */}
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