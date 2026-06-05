'use client'

import { useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function SharePatientFolder({ patient, treatments, prescriptions, invoices }: any) {
  const [sharing, setSharing] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState(patient?.email || '')
  const [sending, setSending] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  async function generatePDFBlob(): Promise<Blob | null> {
    const clinicName = "Finest Dental Care"
    const clinicAddress = "446/3, Third Lane, Nawala Rd, 10107"
    const clinicPhone = "+94 77 288 6121"
    const clinicEmail = "contact@finestdentalcare.lk"
    const clinicWebsite = "www.finestdentalcare.lk"
    const clinicLicense = "Reg No: DENT/2024/001"

    const pdfContent = document.createElement('div')
    pdfContent.style.padding = '30px'
    pdfContent.style.fontFamily = 'Arial, sans-serif'
    pdfContent.style.backgroundColor = 'white'
    pdfContent.style.width = '800px'
    pdfContent.style.position = 'absolute'
    pdfContent.style.left = '-9999px'
    pdfContent.style.top = '0'
    
    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
        <div style="margin-bottom: 15px;">
          <img src="/logo.png" alt="Clinic Logo" style="height: 80px; margin: 0 auto;" />
        </div>
        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">${clinicName}</h1>
        <p style="color: #666; margin: 5px 0 0;">Your Trusted Dental Care Partner</p>
        <div style="margin-top: 10px; font-size: 12px; color: #888;">
          <p>${clinicAddress}</p>
          <p>📞 ${clinicPhone} | ✉️ ${clinicEmail} | 🌐 ${clinicWebsite}</p>
          <p>${clinicLicense}</p>
        </div>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <h2 style="background: #f3f4f6; display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 18px;">
          PATIENT DENTAL FOLDER
        </h2>
        <p style="color: #666; margin-top: 5px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="background: #2563eb; color: white; padding: 10px; border-radius: 5px; margin: 0 0 15px 0; font-size: 16px;">
          📋 PATIENT INFORMATION
        </h3>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb;">
          <tr>
            <td style="padding: 10px; width: 140px; font-weight: bold;">Full Name:</td>
            <td style="padding: 10px;">${patient?.first_name || ''} ${patient?.last_name || ''}</td>
            <td style="padding: 10px; width: 140px; font-weight: bold;">Date of Birth:</td>
            <td style="padding: 10px;">${patient?.date_of_birth || 'N/A'}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 10px; font-weight: bold;">Phone:</td>
            <td style="padding: 10px;">${patient?.phone || 'N/A'}</td>
            <td style="padding: 10px; font-weight: bold;">Email:</td>
            <td style="padding: 10px;">${patient?.email || 'N/A'}</td>
          </tr>
          ${patient?.address ? `
          <tr>
            <td style="padding: 10px; font-weight: bold;">Address:</td>
            <td style="padding: 10px;" colspan="3">${patient.address}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="background: #10b981; color: white; padding: 10px; border-radius: 5px; margin: 0 0 15px 0; font-size: 16px;">
          🦷 TREATMENT HISTORY
        </h3>
        ${treatments && treatments.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Date</th>
                <th style="padding: 10px; text-align: left;">Procedure</th>
                <th style="padding: 10px; text-align: left;">Diagnosis</th>
                <th style="padding: 10px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${treatments.map((t: any) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px;">${new Date(t.created_at).toLocaleDateString()}</td>
                  <td style="padding: 8px;">${t.procedure_code} - ${t.procedure_name}</td>
                  <td style="padding: 8px;">${t.diagnosis || '-'}</td>
                  <td style="padding: 8px; text-align: right;">$${t.total_price?.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No treatments recorded</p>'}
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="background: #8b5cf6; color: white; padding: 10px; border-radius: 5px; margin: 0 0 15px 0; font-size: 16px;">
          💊 PRESCRIPTIONS
        </h3>
        ${prescriptions && prescriptions.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Date</th>
                <th style="padding: 10px; text-align: left;">Medication</th>
                <th style="padding: 10px; text-align: left;">Dosage</th>
                <th style="padding: 10px; text-align: left;">Frequency</th>
                <th style="padding: 10px; text-align: left;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${prescriptions.map((p: any) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px;">${new Date(p.issued_date).toLocaleDateString()}</td>
                  <td style="padding: 8px;">${p.drugs?.name} (${p.drugs?.strength})</td>
                  <td style="padding: 8px;">${p.dosage}</td>
                  <td style="padding: 8px;">${p.frequency}</td>
                  <td style="padding: 8px;">${p.duration}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No prescriptions issued</p>'}
      </div>

      ${invoices && invoices.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="background: #f59e0b; color: white; padding: 10px; border-radius: 5px; margin: 0 0 15px 0; font-size: 16px;">
            💰 INVOICE HISTORY
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Invoice #</th>
                <th style="padding: 10px; text-align: left;">Date</th>
                <th style="padding: 10px; text-align: right;">Total</th>
                <th style="padding: 10px; text-align: left;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map((inv: any) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px;">${inv.invoice_number}</td>
                  <td style="padding: 8px;">${new Date(inv.created_at).toLocaleDateString()}</td>
                  <td style="padding: 8px; text-align: right;">$${(inv.grand_total || inv.total || 0).toFixed(2)}</td>
                  <td style="padding: 8px;">${inv.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af;">
          <div>
            <p>${clinicName}</p>
            <p>${clinicAddress}</p>
          </div>
          <div>
            <p>📞 ${clinicPhone}</p>
            <p>✉️ ${clinicEmail}</p>
          </div>
          <div>
            <p>${clinicWebsite}</p>
            <p>${clinicLicense}</p>
          </div>
        </div>
        <p style="margin-top: 15px; font-size: 10px; color: #9ca3af;">
          This is an electronically generated medical document. No signature required.
        </p>
        <p style="font-size: 9px; color: #cbd5e1; margin-top: 10px;">
          Generated on ${new Date().toLocaleString()}
        </p>
      </div>
    `

    document.body.appendChild(pdfContent)

    try {
      const canvas = await html2canvas(pdfContent, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        windowWidth: pdfContent.scrollWidth,
        windowHeight: pdfContent.scrollHeight
      })
      
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const marginX = 10
      const marginY = 10
      
      let heightLeft = imgHeight
      let position = 0
      
      pdf.addImage(imgData, 'PNG', marginX, marginY - position, imgWidth, imgHeight)
      heightLeft -= (pageHeight - marginY * 2)
      
      while (heightLeft > 0) {
        position += (pageHeight - marginY * 2)
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', marginX, marginY - position, imgWidth, imgHeight)
        heightLeft -= (pageHeight - marginY * 2)
      }
      
      const pdfBlob = pdf.output('blob')
      return pdfBlob
    } catch (error) {
      console.error('PDF generation error:', error)
      return null
    } finally {
      document.body.removeChild(pdfContent)
    }
  }

  async function handleDownload() {
    setSharing(true)
    try {
      const pdfBlob = await generatePDFBlob()
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${patient?.first_name || 'Patient'}_${patient?.last_name || 'Medical'}_Folder.pdf`
        a.click()
        URL.revokeObjectURL(url)
        alert('✓ PDF downloaded successfully!')
      } else {
        alert('Error generating PDF')
      }
    } catch (error) {
      alert('Error generating PDF: ' + error)
    }
    setSharing(false)
  }

  async function handleSendEmail() {
    if (!email) {
      alert('Please enter patient email address')
      return
    }

    setSending(true)
    try {
      const pdfBlob = await generatePDFBlob()
      if (pdfBlob) {
        const reader = new FileReader()
        reader.readAsDataURL(pdfBlob)
        reader.onloadend = async () => {
          const base64data = reader.result?.toString().split(',')[1]

          const response = await fetch('/api/send-patient-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              patientName: `${patient?.first_name || ''} ${patient?.last_name || ''}`,
              pdfBase64: base64data,
              pdfName: `${patient?.first_name || 'Patient'}_${patient?.last_name || 'Medical'}_Folder.pdf`
            })
          })

          const result = await response.json()
          if (result.success) {
            alert(`✓ Medical folder sent to ${email}`)
            setShowEmailModal(false)
          } else {
            alert('Failed to send email: ' + result.error)
          }
          setSending(false)
        }
      } else {
        alert('Error generating PDF')
        setSending(false)
      }
    } catch (error) {
      alert('Error: ' + error)
      setSending(false)
    }
  }

  if (!isMounted) {
    return <div className="flex gap-3"></div>
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={sharing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <span>📄</span>
          {sharing ? 'Generating...' : 'Download PDF'}
        </button>
        
        <button
          onClick={() => setShowEmailModal(true)}
          disabled={sharing}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <span>📧</span>
          Send to Patient Email
        </button>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold mb-4">Send Medical Folder</h2>
            <p className="text-gray-600 mb-4">
              Send complete medical records to patient's email address.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSendEmail}
                disabled={sending}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Email'}
              </button>
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}