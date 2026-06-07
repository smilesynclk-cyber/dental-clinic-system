'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import Link from 'next/link'

export default function MonitoringPage() {
  const [stats, setStats] = useState({
    databaseSize: 0,
    databaseSizeFormatted: '0 MB',
    storageUsed: 0,
    totalPatients: 0,
    totalAppointments: 0,
    totalInvoices: 0,
    totalTreatments: 0,
    totalPrescriptions: 0,
    totalUsers: 0,
    emailLogsCount: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)

    try {
      // Try to get database size (might fail on free tier)
      let dbSizeMB = 0
      try {
        const { data: dbSize, error: dbError } = await supabase.rpc('get_database_size')
        if (!dbError && dbSize) {
          dbSizeMB = dbSize
        }
      } catch (e) {
        console.log('Database size function not available')
      }

      // Get counts from all tables
      const [
        { count: patientCount },
        { count: appointmentCount },
        { count: invoiceCount },
        { count: treatmentCount },
        { count: prescriptionCount },
        { count: userCount },
        { count: emailCount }
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('treatments').select('*', { count: 'exact', head: true }),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('email_logs').select('*', { count: 'exact', head: true })
      ])

      // Get storage usage
      let storageUsedMB = 0
      try {
        const { data: buckets } = await supabase.storage.listBuckets()
        if (buckets) {
          for (const bucket of buckets) {
            const { data: files } = await supabase.storage.from(bucket.name).list()
            if (files) {
              storageUsedMB += files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0) / (1024 * 1024)
            }
          }
        }
      } catch (e) {
        console.log('Storage stats not available')
      }

      setStats({
        databaseSize: dbSizeMB,
        databaseSizeFormatted: dbSizeMB > 0 ? `${dbSizeMB.toFixed(2)} MB` : 'N/A',
        storageUsed: storageUsedMB,
        totalPatients: patientCount || 0,
        totalAppointments: appointmentCount || 0,
        totalInvoices: invoiceCount || 0,
        totalTreatments: treatmentCount || 0,
        totalPrescriptions: prescriptionCount || 0,
        totalUsers: userCount || 0,
        emailLogsCount: emailCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
    setLoading(false)
  }

  const freeLimits = {
    database: 500, // MB
    storage: 1024, // MB (1 GB)
    bandwidth: 5120 // MB (5 GB)
  }

  const getPercentage = (used: number, limit: number) => (used / limit) * 100
  const getColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 System Monitoring</h1>
            <p className="text-gray-500 mt-1">Track database usage and system health</p>
          </div>
          <Link href="/protected/admin" className="text-blue-600 hover:underline">
            ← Back to Admin Panel
          </Link>
        </div>

        {/* Warning Banner */}
        {(stats.databaseSize > 0 && getPercentage(stats.databaseSize, freeLimits.database) >= 80) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <p className="text-yellow-800 font-medium">⚠️ Approaching Free Tier Limits</p>
            <p className="text-yellow-700 text-sm mt-1">Consider upgrading to Pro plan or optimizing data storage.</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Database Size */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Database Size</p>
                <p className="text-2xl font-bold">{stats.databaseSizeFormatted}</p>
                <p className="text-xs text-gray-400">Limit: {freeLimits.database} MB</p>
              </div>
              <div className="text-2xl">🗄️</div>
            </div>
            {stats.databaseSize > 0 && (
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`${getColor(getPercentage(stats.databaseSize, freeLimits.database))} h-full rounded-full transition-all`}
                  style={{ width: `${Math.min(getPercentage(stats.databaseSize, freeLimits.database), 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Storage Used */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Storage Used</p>
                <p className="text-2xl font-bold">{stats.storageUsed.toFixed(2)} MB</p>
                <p className="text-xs text-gray-400">Limit: {freeLimits.storage} MB</p>
              </div>
              <div className="text-2xl">📁</div>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`${getColor(getPercentage(stats.storageUsed, freeLimits.storage))} h-full rounded-full`}
                style={{ width: `${Math.min(getPercentage(stats.storageUsed, freeLimits.storage), 100)}%` }}
              />
            </div>
          </div>

          {/* Total Patients */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Total Patients</p>
                <p className="text-2xl font-bold">{stats.totalPatients.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Active records</p>
              </div>
              <div className="text-2xl">👥</div>
            </div>
          </div>

          {/* Appointments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Total Appointments</p>
                <p className="text-2xl font-bold">{stats.totalAppointments.toLocaleString()}</p>
                <p className="text-xs text-gray-400">All time</p>
              </div>
              <div className="text-2xl">📅</div>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Treatments</p>
            <p className="text-2xl font-bold">{stats.totalTreatments.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Prescriptions</p>
            <p className="text-2xl font-bold">{stats.totalPrescriptions.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Invoices</p>
            <p className="text-2xl font-bold">{stats.totalInvoices.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Email Logs</p>
            <p className="text-2xl font-bold">{stats.emailLogsCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Optimization Tips */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">💡 Optimization Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <p className="font-medium text-blue-600">📊 Database</p>
              <p className="text-sm text-gray-600 mt-1">Keep database under 400 MB to stay safe. Clean old data regularly.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-medium text-blue-600">🖼️ Images</p>
              <p className="text-sm text-gray-600 mt-1">Compress X-rays before upload. Consider 80% quality for patient photos.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-medium text-blue-600">🗑️ Data Cleanup</p>
              <p className="text-sm text-gray-600 mt-1">Archive invoices older than 3 years. Delete inactive patients.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-medium text-blue-600">📈 Monitoring</p>
              <p className="text-sm text-gray-600 mt-1">Check this dashboard weekly to track usage.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}