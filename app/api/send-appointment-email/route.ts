import { createClient } from '@/lib/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY)

// TEST MODE - Set to false when ready for production
const TEST_MODE = true
const TEST_RECIPIENT = 'smilesynclk@gmail.com'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { appointmentId, patientEmail, patientName, appointmentData } = body
    
    // Determine recipient based on test mode
    const recipientEmail = TEST_MODE ? TEST_RECIPIENT : patientEmail
    const originalRecipient = patientEmail
    
    console.log('TEST MODE:', TEST_MODE ? 'ON' : 'OFF')
    console.log('Appointment confirmation for:', originalRecipient)
    console.log('Actual recipient:', recipientEmail)
    
    const supabase = await createClient()
    
    // Generate appointment confirmation HTML
    const appointmentHTML = generateAppointmentHTML(appointmentData, patientName)
    
    // Add test mode note to subject if in test mode
    const subjectPrefix = TEST_MODE ? '[TEST] ' : ''
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Dental Clinic <onboarding@resend.dev>',
      to: recipientEmail,
      subject: `${subjectPrefix}Appointment Confirmation - ${appointmentData.date} at ${appointmentData.time}`,
      html: appointmentHTML,
    })
    
    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    console.log('Email sent successfully:', data)
    
    // Log the email in database
    await supabase
      .from('email_logs')
      .insert({
        appointment_id: appointmentId,
        recipient_email: originalRecipient,
        actual_sent_to: recipientEmail,
        test_mode: TEST_MODE,
        status: 'sent',
        sent_at: new Date().toISOString(),
        message_id: data?.id,
        email_type: 'appointment_confirmation'
      })
    
    return NextResponse.json({ 
      success: true, 
      message: TEST_MODE 
        ? `[TEST MODE] Appointment confirmation would be sent to ${originalRecipient}. Actually sent to ${recipientEmail}`
        : `Appointment confirmation sent to ${recipientEmail}`
    })
    
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }, { status: 500 })
  }
}

function generateAppointmentHTML(appointmentData: any, patientName: string) {
  // Add test watermark if in test mode
  const testWatermark = TEST_MODE ? `
    <div style="background: #ff9800; color: white; text-align: center; padding: 5px; margin-bottom: 10px; border-radius: 5px;">
      🔬 TEST MODE - This is a test appointment confirmation. No actual appointment scheduled. 🔬
    </div>
  ` : ''
  
  // Format date nicely
  const formattedDate = new Date(appointmentData.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Appointment Confirmation</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #fff;
        }
        .header {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0 0;
          opacity: 0.9;
        }
        .content {
          padding: 30px 25px;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
        }
        .appointment-details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          border-left: 4px solid #4caf50;
        }
        .appointment-details p {
          margin: 8px 0;
        }
        .detail-label {
          font-weight: bold;
          color: #555;
          width: 120px;
          display: inline-block;
        }
        .reminder-box {
          background: #e8f5e9;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: center;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #e0e0e0;
        }
        .button {
          display: inline-block;
          background: #4caf50;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 15px;
        }
        @media print {
          body { background: white; }
          .container { max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${testWatermark}
        <div class="header">
          <h1>🦷 ${appointmentData.clinic_name || 'Finest Dental Care'}</h1>
          <p>Your Trusted Dental Care Partner</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <p>Dear <strong>${patientName}</strong>,</p>
            <p>Your appointment has been successfully scheduled. Please find the details below:</p>
          </div>
          
          <div class="appointment-details">
            <p><span class="detail-label">📅 Date:</span> ${formattedDate}</p>
            <p><span class="detail-label">⏰ Time:</span> ${appointmentData.time}</p>
            <p><span class="detail-label">📋 Type:</span> ${appointmentData.type || 'General Checkup'}</p>
            <p><span class="detail-label">👨‍⚕️ Doctor:</span> Dr. ${appointmentData.doctor_name || 'Staff'}</p>
            ${appointmentData.duration_minutes ? `<p><span class="detail-label">⏱️ Duration:</span> ${appointmentData.duration_minutes} minutes</p>` : ''}
            ${appointmentData.room_number ? `<p><span class="detail-label">🚪 Room:</span> ${appointmentData.room_number}</p>` : ''}
            ${appointmentData.notes ? `<p><span class="detail-label">📝 Notes:</span> ${appointmentData.notes}</p>` : ''}
          </div>
          
          <div class="reminder-box">
            <p>📌 <strong>Please arrive 10 minutes early</strong> for your appointment.</p>
            <p>Bring your any relevant medical records.</p>
            <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
          </div>
          
          <p style="margin-top: 20px;">
            To cancel or reschedule, please contact our reception at:
          </p>
          <p>
            📞 ${appointmentData.clinic_phone || '+94 77 288 6121'}<br>
            ✉️ ${appointmentData.clinic_email || 'contact@finestdentalcare.lk'}
          </p>
        </div>
        
        <div class="footer">
          <p>
            <strong>${appointmentData.clinic_name || 'Finest Dental Care'}</strong><br>
            ${appointmentData.clinic_address || '446/3, Third Lane, Nawala Rd, 10107'}<br>
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}