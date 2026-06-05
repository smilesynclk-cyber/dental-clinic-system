import { createClient } from '@/lib/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get all active clinics with expiring subscriptions
    const today = new Date()
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data: expiringClinics } = await supabase
      .from('clinics')
      .select('*, users!clinic_id(email, first_name, last_name, role)')
      .eq('is_active', true)
      .not('subscription_expires_at', 'is', null)
      .lte('subscription_expires_at', thirtyDaysFromNow.toISOString())
      .gte('subscription_expires_at', today.toISOString())

    const reminders = []
    
    for (const clinic of expiringClinics || []) {
      const expiryDate = new Date(clinic.subscription_expires_at)
      const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
      
      // Find admin user for this clinic
      const adminUser = clinic.users?.find((u: any) => u.role === 'owner')
      
      if (adminUser?.email) {
        // Send email reminder
        await resend.emails.send({
          from: 'Finest Dental Care <onboarding@resend.dev>',
          to: adminUser.email,
          subject: `Subscription Renewal Reminder - ${daysLeft} days left`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #2563eb;">Subscription Renewal Reminder</h2>
              <p>Dear ${adminUser.first_name} ${adminUser.last_name},</p>
              <p>Your subscription for <strong>${clinic.name}</strong> will expire in <strong>${daysLeft} days</strong>.</p>
              <p><strong>Expiry Date:</strong> ${expiryDate.toLocaleDateString()}</p>
              <p><strong>Plan:</strong> ${clinic.subscription_plan || 'Standard'}</p>
              <p>Please renew your subscription to avoid service interruption.</p>
              <hr />
              <p style="font-size: 12px; color: #666;">
                Contact us at support@finestdentalcare.lk for renewal assistance.
              </p>
            </div>
          `
        })
        
        reminders.push({ clinic: clinic.name, daysLeft, email: adminUser.email })
      }
    }

    return NextResponse.json({ 
      success: true, 
      remindersSent: reminders.length,
      reminders 
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}