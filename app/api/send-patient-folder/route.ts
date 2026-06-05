import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { to, patientName, pdfBase64, pdfName } = body

    if (!to || !pdfBase64) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    // Send email with PDF attachment
    const { data, error } = await resend.emails.send({
      from: 'Dental Clinic <onboarding@resend.dev>',
      to: to,
      subject: `Medical Folder - ${patientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Patient Medical Folder</h2>
          <p>Dear ${patientName},</p>
          <p>Please find attached your complete medical folder from Dental Clinic.</p>
          <p>This document includes:</p>
          <ul>
            <li>Patient Information</li>
            <li>Treatment History</li>
            <li>Prescriptions & Medications</li>
            <li>Invoice History</li>
          </ul>
          <p>If you have any questions, please contact our clinic.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: pdfName,
          content: pdfBuffer.toString('base64'),
          encoding: 'base64'
        }
      ]
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 })
  }
}