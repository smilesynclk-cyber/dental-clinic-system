import { createClient } from '@/lib/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Delete old email logs (older than 90 days)
  const { error: logError } = await supabase
    .from('email_logs')
    .delete()
    .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  if (logError) {
    console.error('Cleanup error:', logError)
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Cleanup completed',
    timestamp: new Date().toISOString()
  })
}