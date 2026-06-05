import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Trigger reminders
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/subscription/reminders`, {
    method: 'POST'
  })
  
  const result = await response.json()
  
  return NextResponse.json({ 
    success: true, 
    remindersSent: result.remindersSent,
    timestamp: new Date().toISOString()
  })
}