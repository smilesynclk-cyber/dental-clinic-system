'use client'

import { useState } from 'react'
import { createClient } from '@/lib/client'

export default function SystemSettings({ initialSettings }: { initialSettings: any }) {
  const [settings, setSettings] = useState(initialSettings || {})
  const [loading, setLoading] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const supabase = createClient()

  async function updateSetting(key: string, value: any) {
    setLoading(true)
    
    // Create or update setting
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })

    if (error) {
      alert('Error updating setting: ' + error.message)
    } else {
      alert('Setting updated successfully!')
      setSettings({ ...settings, [key]: value })
    }
    setLoading(false)
  }

  async function toggleSystemStatus() {
    const newStatus = !settings.system_active
    await updateSetting('system_active', newStatus)
  }

  async function sendSubscriptionReminders() {
    setLoading(true)
    setReminderMessage('')
    
    try {
      const response = await fetch('/api/subscription/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const result = await response.json()
      
      if (result.success) {
        setReminderMessage(`✓ Sent ${result.remindersSent} reminder(s) to expiring subscriptions.`)
      } else {
        setReminderMessage('❌ Failed to send reminders: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      setReminderMessage('❌ Error sending reminders')
    }
    
    setTimeout(() => setReminderMessage(''), 5000)
    setLoading(false)
  }

  return (
    <div className="p-4 space-y-4">
      {/* System Status */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">🔒 System Status</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Current Status: 
              <span className={`ml-2 font-medium ${settings.system_active ? 'text-green-600' : 'text-red-600'}`}>
                {settings.system_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {settings.system_active 
                ? 'All clinics can access the system' 
                : 'System is locked. No one can log in.'}
            </p>
          </div>
          <button
            onClick={toggleSystemStatus}
            className={`px-4 py-2 rounded text-white transition ${settings.system_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {settings.system_active ? 'Deactivate System' : 'Activate System'}
          </button>
        </div>
      </div>

      {/* Subscription Reminders */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">📧 Subscription Reminders</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Reminder Days Before Expiry</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.reminder_days || 7}
                onChange={(e) => updateSetting('reminder_days', parseInt(e.target.value))}
                className="border rounded px-3 py-1 w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="90"
              />
              <span className="text-sm text-gray-500">days before expiry</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Reminders will be sent automatically on selected days before subscription expiry.
            </p>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Reminder Message Template</label>
            <textarea
              rows={3}
              value={settings.reminder_message || "Your subscription for {clinic_name} will expire in {days_left} days on {expiry_date}. Please renew to avoid service interruption."}
              onChange={(e) => updateSetting('reminder_message', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Available variables: <code className="bg-gray-100 px-1">{'{clinic_name}'}</code>, 
              <code className="bg-gray-100 px-1 ml-1">{'{days_left}'}</code>, 
              <code className="bg-gray-100 px-1 ml-1">{'{expiry_date}'}</code>
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={sendSubscriptionReminders}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Sending...' : '📧 Send Reminders Now'}
            </button>
            <button
              onClick={async () => {
                if (confirm('This will test the reminder system by sending a test email to your address.')) {
                  setLoading(true)
                  const response = await fetch('/api/subscription/test-reminder', {
                    method: 'POST',
                  })
                  const result = await response.json()
                  alert(result.message)
                  setLoading(false)
                }
              }}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50 transition"
            >
              🔧 Test Reminder
            </button>
          </div>
          
          {reminderMessage && (
            <div className={`p-2 rounded text-sm ${reminderMessage.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {reminderMessage}
            </div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">ℹ️ System Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Version:</span>
            <span className="font-medium">2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last Backup:</span>
            <span className="font-medium">{settings.last_backup || 'Not scheduled'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reminder Schedule:</span>
            <span className="font-medium">Daily at 9:00 AM</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-gray-400">
              For automatic daily reminders, configure a cron job to call:<br/>
              <code className="bg-gray-100 px-1 text-xs">/api/cron/subscription-reminder</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}