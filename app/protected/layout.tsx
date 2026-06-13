import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import TrialBanner from '@/components/TrialBanner'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch trial info for the user's clinic
  const { data: userData } = await supabase
    .from('users')
    .select('clinic_id')
    .eq('id', user.id)
    .single()

  let trialInfo = null
  if (userData?.clinic_id) {
    const { data: clinic } = await supabase
      .from('clinics')
      .select('is_trial, trial_start_date, trial_end_date, name')
      .eq('id', userData.clinic_id)
      .single()
    trialInfo = clinic
  }

  return (
    <div>
      <TrialBanner initialTrialInfo={trialInfo} />
      {children}
    </div>
  )
}