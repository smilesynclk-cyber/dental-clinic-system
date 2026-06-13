'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'

interface TrialStatusCardProps {
  initialTrialInfo?: {
    is_trial: boolean;
    trial_start_date: string | null;
    trial_end_date: string | null;
  } | null;
}

export default function TrialStatusCard({ initialTrialInfo }: TrialStatusCardProps) {
  const [trialInfo, setTrialInfo] = useState<{
    isTrial: boolean;
    daysLeft: number;
    trialStartDate: string | null;
    trialEndDate: string | null;
  }>({ 
    isTrial: initialTrialInfo?.is_trial || false, 
    daysLeft: 0, 
    trialStartDate: initialTrialInfo?.trial_start_date || null,
    trialEndDate: initialTrialInfo?.trial_end_date || null
  })
  const [loading, setLoading] = useState(!initialTrialInfo)

  useEffect(() => {
    // If we have initial data, calculate days left
    if (initialTrialInfo?.is_trial && initialTrialInfo?.trial_end_date) {
      const trialEnd = new Date(initialTrialInfo.trial_end_date)
      const today = new Date()
      const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 3600 * 24))
      
      setTrialInfo({
        isTrial: true,
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        trialStartDate: initialTrialInfo.trial_start_date,
        trialEndDate: initialTrialInfo.trial_end_date
      })
      setLoading(false)
    } else if (!initialTrialInfo) {
      // Fallback to client-side fetch
      fetchTrialInfo()
    } else {
      setLoading(false)
    }
  }, [initialTrialInfo])

  async function fetchTrialInfo() {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: userData } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', session.user.id)
        .single()

      if (userData?.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('is_trial, trial_start_date, trial_end_date')
          .eq('id', userData.clinic_id)
          .single()

        if (clinic?.is_trial && clinic?.trial_end_date) {
          const trialEnd = new Date(clinic.trial_end_date)
          const today = new Date()
          const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 3600 * 24))
          
          setTrialInfo({
            isTrial: true,
            daysLeft: daysLeft > 0 ? daysLeft : 0,
            trialStartDate: clinic.trial_start_date,
            trialEndDate: clinic.trial_end_date
          })
        }
      }
    } catch (error) {
      console.error('Error fetching trial info:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !trialInfo.isTrial) return null

  const getProgressPercentage = () => {
    if (!trialInfo.trialStartDate || !trialInfo.trialEndDate) return 0
    const start = new Date(trialInfo.trialStartDate).getTime()
    const end = new Date(trialInfo.trialEndDate).getTime()
    const now = new Date().getTime()
    const total = end - start
    const elapsed = now - start
    const percentage = (elapsed / total) * 100
    return Math.min(100, Math.max(0, percentage))
  }

  const getStatusColor = () => {
    if (trialInfo.daysLeft <= 1) return 'text-red-600'
    if (trialInfo.daysLeft <= 3) return 'text-orange-600'
    return 'text-green-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span>🎉</span> Free Trial Status
        </h3>
        <span className={`text-2xl font-bold ${getStatusColor()}`}>
          {trialInfo.daysLeft} days left
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Trial Progress</span>
          <span>{Math.round(getProgressPercentage())}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 rounded-full h-2 transition-all duration-500"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>
      
      {/* Date Info */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Started:</span>
          <span className="font-medium">
            {trialInfo.trialStartDate ? new Date(trialInfo.trialStartDate).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Expires:</span>
          <span className={`font-medium ${trialInfo.daysLeft <= 3 ? 'text-red-600' : ''}`}>
            {trialInfo.trialEndDate ? new Date(trialInfo.trialEndDate).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>
      
      {/* Warning Message */}
      {trialInfo.daysLeft <= 3 && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            {trialInfo.daysLeft === 0 ? (
              '⚠️ Your free trial has ended. Please contact the clinic owner to upgrade.'
            ) : trialInfo.daysLeft === 1 ? (
              '⚠️ Last day of the free trial! Please remind the clinic owner to upgrade.'
            ) : (
              `⚠️ Trial ends in ${trialInfo.daysLeft} days. Please remind the clinic owner to upgrade.`
            )}
          </p>
        </div>
      )}
    </div>
  )
}