import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST() {
  try {
    // Send a test email to the admin
    const { data, error } = await resend.emails.send({
      from: 'Finest Dental Care <onboarding@resend.dev>',
      to: 'admin@smilesync.com',
      subject: 'Test Subscription Reminder',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Test Subscription Reminder</h2>
          <p>This is a test email to verify the subscription reminder system is working correctly.</p>
          <p>If you received this email, the reminder system is configured properly.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">
            This is a test email. No action required.
          </p>
        </div>
      `
    })

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Test email sent successfully!' })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to send test email' }, { status: 500 })
  }
}