'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'

interface TrialBannerProps {
  initialTrialInfo?: {
    is_trial: boolean;
    trial_start_date: string | null;
    trial_end_date: string | null;
    name: string;
  } | null;
}

export default function TrialBanner({ initialTrialInfo }: TrialBannerProps) {
  const [trialInfo, setTrialInfo] = useState<{
    isTrial: boolean;
    daysLeft: number;
    trialEndDate: string | null;
  }>({ 
    isTrial: initialTrialInfo?.is_trial || false, 
    daysLeft: 0, 
    trialEndDate: initialTrialInfo?.trial_end_date || null 
  })
  const [loading, setLoading] = useState(!initialTrialInfo)
  const supabase = createClient()

  useEffect(() => {
    // If we already have initialTrialInfo, use it
    if (initialTrialInfo?.is_trial && initialTrialInfo?.trial_end_date) {
      const trialEnd = new Date(initialTrialInfo.trial_end_date)
      const today = new Date()
      const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 3600 * 24))
      
      setTrialInfo({
        isTrial: true,
        daysLeft: daysLeft > 0 ? daysLeft : 0,
        trialEndDate: initialTrialInfo.trial_end_date
      })
      setLoading(false)
    } else {
      // Fallback to client-side fetch if no initial data
      fetchTrialInfo()
    }
  }, [initialTrialInfo])

  async function fetchTrialInfo() {
    try {
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

  const getBannerColor = () => {
    if (trialInfo.daysLeft <= 1) return 'bg-red-500'
    if (trialInfo.daysLeft <= 3) return 'bg-orange-500'
    return 'bg-gradient-to-r from-blue-500 to-purple-500'
  }

  const getMessage = () => {
    if (trialInfo.daysLeft === 0) {
      return 'Your free trial has expired. Please upgrade to continue using the system.'
    }
    if (trialInfo.daysLeft === 1) {
      return '⚠️ Last day of your free trial! Upgrade now to avoid interruption.'
    }
    return `🎉 ${trialInfo.daysLeft} days remaining in your free trial`
  }

  return (
    <div className={`${getBannerColor()} text-white px-4 py-3 shadow-md sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold">
              Free 7-Day Trial Active
            </p>
            <p className="text-sm opacity-90">
              {getMessage()}
            </p>
          </div>
        </div>
        
        {trialInfo.daysLeft > 0 && (
          <div className="flex gap-3">
            <div className="bg-white/20 rounded-lg px-4 py-1 text-center">
              <div className="text-2xl font-bold">{trialInfo.daysLeft}</div>
              <div className="text-xs">Days Left</div>
            </div>
            <button
              onClick={() => window.location.href = '/pricing'}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition"
            >
              Upgrade Now
            </button>
          </div>
        )}
        
        {trialInfo.daysLeft === 0 && (
          <button
            onClick={() => window.location.href = '/pricing'}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-yellow-600 transition"
          >
            Upgrade Subscription
          </button>
        )}
      </div>
    </div>
  )
}