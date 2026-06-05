'use client'

import { createClient } from '@/lib/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { useCurrency } from '@/lib/currency-context'
import { useEffect, useState } from 'react'

export default function DoctorDashboard() {
  const { format } = useCurrency()
  const [data, setData] = useState({
    dbUser: null as any,
    appointments: [] as any[],
    allPatients: [] as any[],
    patientCount: 0,
    upcomingCount: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    clinic: null as any,
    loading: true
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const supabase = createClient()
    
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      redirect('/login')
      return
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('*, clinics(*)')
      .eq('email', authUser.email)
      .single()

    if (dbUser?.role !== 'doctor' && dbUser?.role !== 'owner') {
      redirect('/protected/dashboard/reception')
      return
    }

    const clinic = dbUser?.clinics
    const today = new Date().toISOString().split('T')[0]

    // Fetch data in parallel for better performance
    const [
      appointmentsResult,
      allPatientsResult,
      patientCountResult,
      upcomingCountResult,
      todayInvoicesResult,
      monthInvoicesResult
    ] = await Promise.all([
      supabase
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
        .order('time', { ascending: true }),
      supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinic?.id)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinic?.id),
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .gte('date', today),
      supabase
        .from('invoices')
        .select('grand_total, total')
        .eq('status', 'paid')
        .gte('paid_at', `${today}T00:00:00`),
      supabase
        .from('invoices')
        .select('grand_total, total')
        .eq('status', 'paid')
        .gte('paid_at', `${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}T00:00:00`)
    ])

    const todayRevenue = todayInvoicesResult.data?.reduce((sum, inv) => sum + (inv.grand_total || inv.total || 0), 0) || 0
    const monthRevenue = monthInvoicesResult.data?.reduce((sum, inv) => sum + (inv.grand_total || inv.total || 0), 0) || 0

    setData({
      dbUser,
      appointments: appointmentsResult.data || [],
      allPatients: allPatientsResult.data || [],
      patientCount: patientCountResult.count || 0,
      upcomingCount: upcomingCountResult.count || 0,
      todayRevenue,
      monthRevenue,
      clinic,
      loading: false
    })
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Welcome back, Dr. {data.dbUser?.first_name}
        </h1>
        <p className="text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{data.patientCount || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{format(data.todayRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Patients</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{data.appointments?.length || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Upcoming</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{data.upcomingCount || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-5 text-white">
          <p className="text-sm opacity-90">Monthly Revenue</p>
          <p className="text-3xl font-bold mt-1">{format(data.monthRevenue)}</p>
          <p className="text-xs opacity-75 mt-2">Total collections this month</p>
        </div>
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-5 text-white">
          <p className="text-sm opacity-90">Average per Patient</p>
          <p className="text-3xl font-bold mt-1">
            {data.patientCount > 0 ? format(data.monthRevenue / data.patientCount) : format(0)}
          </p>
          <p className="text-xs opacity-75 mt-2">Average revenue per patient</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link 
          href="/patients/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm flex items-center gap-2"
        >
          <span>+</span> Register New Patient
        </Link>
        <Link 
          href="/appointments/new" 
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm flex items-center gap-2"
        >
          <span>📅</span> Schedule Appointment
        </Link>
        <Link 
          href="/patients" 
          className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm flex items-center gap-2"
        >
          <span>🔍</span> View All Patients
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">📅 Today's Schedule</h2>
            <p className="text-sm text-gray-500 mt-0.5">{data.appointments?.length || 0} appointments</p>
          </div>
          <div className="divide-y divide-gray-100">
            {data.appointments && data.appointments.length > 0 ? (
              data.appointments.map((apt: any) => (
                <div key={apt.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-14 text-center">
                        <p className="text-lg font-bold text-gray-800">{apt.time.slice(0,5)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {apt.patients?.first_name} {apt.patients?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{apt.type}</p>
                        {apt.patients?.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">📞 {apt.patients.phone}</p>
                        )}
                      </div>
                    </div>
                    <Link 
                      href={`/patients/${apt.patients?.id}`} 
                      className="text-blue-600 text-sm hover:underline"
                    >
                      View Chart →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p className="text-lg mb-2">😊</p>
                <p>No appointments scheduled for today</p>
                <Link href="/appointments/new" className="text-blue-600 text-sm mt-2 inline-block">
                  + Schedule an appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">🆕 Recent Patients</h2>
            <p className="text-sm text-gray-500 mt-0.5">Last 8 registered patients</p>
          </div>
          <div className="divide-y divide-gray-100">
            {data.allPatients && data.allPatients.length > 0 ? (
              data.allPatients.map((patient: any) => (
                <div key={patient.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">
                        {patient.first_name} {patient.last_name}
                      </p>
                      {patient.phone && (
                        <p className="text-sm text-gray-500">📞 {patient.phone}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        Registered: {new Date(patient.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link 
                      href={`/patients/${patient.id}`} 
                      className="text-blue-600 text-sm hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>No patients yet</p>
                <Link href="/patients/new" className="text-blue-600 text-sm mt-2 inline-block">
                  + Register your first patient
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}