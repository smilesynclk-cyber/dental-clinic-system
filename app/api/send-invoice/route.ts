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
    const { invoiceId, patientEmail, patientName, invoiceData } = body
    
    // Determine recipient based on test mode
    const recipientEmail = TEST_MODE ? TEST_RECIPIENT : patientEmail
    const originalRecipient = patientEmail
    
    console.log('TEST MODE:', TEST_MODE ? 'ON' : 'OFF')
    console.log('Original recipient:', originalRecipient)
    console.log('Actual recipient:', recipientEmail)
    console.log('Invoice number:', invoiceData?.invoice_number)
    
    const supabase = await createClient()
    
    // Generate invoice HTML with LKR currency
    const invoiceHTML = generateInvoiceHTML(invoiceData, patientName)
    
    // Add test mode note to subject if in test mode
    const subjectPrefix = TEST_MODE ? '[TEST] ' : ''
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Finest Dental Care <onboarding@resend.dev>',
      to: recipientEmail,
      subject: `${subjectPrefix}Invoice ${invoiceData.invoice_number} from ${invoiceData.clinic_name || 'Finest Dental Care'}`,
      html: invoiceHTML,
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
        invoice_id: invoiceId,
        recipient_email: originalRecipient,
        actual_sent_to: recipientEmail,
        test_mode: TEST_MODE,
        status: 'sent',
        sent_at: new Date().toISOString(),
        message_id: data?.id
      })
    
    await supabase
      .from('invoices')
      .update({ 
        sent_to_patient_email: true, 
        email_sent_at: new Date().toISOString() 
      })
      .eq('id', invoiceId)
    
    const responseMessage = TEST_MODE 
      ? `[TEST MODE] Invoice would be sent to ${originalRecipient}. Actually sent to ${recipientEmail}`
      : `Invoice sent to ${recipientEmail}`
    
    return NextResponse.json({ 
      success: true, 
      message: responseMessage,
      testMode: TEST_MODE,
      sentTo: recipientEmail
    })
    
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }, { status: 500 })
  }
}

function generateInvoiceHTML(invoiceData: any, patientName: string) {
  const treatments = invoiceData.treatments || []
  const discountAmount = invoiceData.discount_amount || 0
  const subtotal = invoiceData.subtotal || 0
  const grandTotal = invoiceData.grand_total || invoiceData.total || 0
  
  // Format LKR currency
  const formatLKR = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  // Add test watermark if in test mode
  const testWatermark = TEST_MODE ? `
    <div style="background: #ff9800; color: white; text-align: center; padding: 5px; margin-bottom: 10px; border-radius: 5px;">
      🔬 TEST MODE - This is a test invoice. No payment required. 🔬
    </div>
  ` : ''
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoiceData.invoice_number}</title>
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
        .invoice-details {
          background: #f8f9fa;
          padding: 15px 20px;
          border-radius: 10px;
          margin: 20px 0;
          border-left: 4px solid #2a5298;
        }
        .invoice-details p {
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #2a5298;
          color: white;
          padding: 12px;
          text-align: left;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        .totals {
          text-align: right;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px solid #e0e0e0;
        }
        .totals p {
          margin: 5px 0;
        }
        .grand-total {
          font-size: 20px;
          font-weight: bold;
          color: #2e7d32;
          margin-top: 10px;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #e0e0e0;
        }
        .status-paid {
          display: inline-block;
          background: #4caf50;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }
        .status-pending {
          display: inline-block;
          background: #ff9800;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }
        .currency-symbol {
          font-weight: normal;
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
          <h1>🦷 ${invoiceData.clinic_name || 'Finest Dental Care'}</h1>
          <p>Your Trusted Dental Care Partner</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <p>Dear <strong>${patientName}</strong>,</p>
            <p>Thank you for choosing Finest Dental Care. Please find your invoice details below:</p>
          </div>
          
          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${invoiceData.invoice_number}</p>
            <p><strong>Invoice Date:</strong> ${new Date(invoiceData.created_at).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span class="${invoiceData.status === 'paid' ? 'status-paid' : 'status-pending'}">${invoiceData.status === 'paid' ? 'PAID' : 'PENDING'}</span></p>
            <p><strong>Provider:</strong> Dr. ${invoiceData.doctor_name || 'Staff'}</p>
          </div>
          
          <h3>📋 Treatment Details</h3>
          <table>
            <thead>
              <tr><th>Description</th><th>Qty</th><th>Amount</th></tr>
            </thead>
            <tbody>
              ${treatments.map((t: any) => `
                <tr>
                  <td>
                    <strong>${t.procedure_code}</strong> - ${t.procedure_name}<br>
                    <small style="color:#666;">${t.diagnosis || ''}</small>
                    ${t.tooth_number ? `<br><small style="color:#666;">Tooth #${t.tooth_number}</small>` : ''}
                   </td>
                  <td style="text-align: center;">${t.quantity}</td>
                  <td style="text-align: right;">${formatLKR(t.total_price)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <p>Subtotal: ${formatLKR(subtotal)}</p>
            ${discountAmount > 0 ? `<p>Discount: -${formatLKR(discountAmount)}</p>` : ''}
            <div class="grand-total">
              Total Amount: ${formatLKR(grandTotal)}
            </div>
          </div>
          
          <p style="margin-top: 25px; font-size: 14px; color: #666;">
            💡 <strong>Payment Instructions:</strong><br>
            Please make payment within 30 days. You can pay at our reception or via bank transfer.<br>
            For any questions, please contact our reception.
          </p>
        </div>
        
        <div class="footer">
          <p>
            <strong>${invoiceData.clinic_name || 'Finest Dental Care'}</strong><br>
            ${invoiceData.clinic_address || '446/3, Third Lane, Nawala Rd, 10107'}<br>
            📞 ${invoiceData.clinic_phone || '+94 77 288 6121'} | ✉️ ${invoiceData.clinic_email || 'contact@finestdentalcare.lk'}<br>
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}