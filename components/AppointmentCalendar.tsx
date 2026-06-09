'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import Link from 'next/link'

interface AppointmentCalendarProps {
  clinicId: string
}

export default function AppointmentCalendar({ clinicId }: AppointmentCalendarProps) {
  const [appointments, setAppointments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [view, setView] = useState('month')
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchDoctors()
    fetchAppointments()
  }, [])

  async function fetchDoctors() {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'doctor')
      .eq('is_active', true)

    if (data) {
      setDoctors(data)
    }
  }

  async function fetchAppointments() {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (
          id,
          first_name,
          last_name,
          phone,
          email,
          date_of_birth,
          address
        ),
        users!doctor_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('clinic_id', clinicId)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (error) {
      console.error('Error fetching appointments:', error)
    } else {
      setAppointments(data || [])
    }
    setLoading(false)
  }

  // Doctor color mapping (main colors)
  const getDoctorMainColor = (doctorId: string) => {
    const index = doctors.findIndex(d => d.id === doctorId)
    if (index === 0) return { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', border: 'border-blue-500', text: 'text-blue-700', light: 'bg-blue-50' }
    if (index === 1) return { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' }
    if (index === 2) return { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', border: 'border-purple-500', text: 'text-purple-700', light: 'bg-purple-50' }
    if (index === 3) return { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', border: 'border-orange-500', text: 'text-orange-700', light: 'bg-orange-50' }
    return { bg: 'bg-gray-500', hover: 'hover:bg-gray-600', border: 'border-gray-500', text: 'text-gray-700', light: 'bg-gray-50' }
  }

  // Status indicator (small mark)
  const getStatusIndicator = (status: string, appointmentDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    const isPast = appointmentDate < today
    
    switch (status) {
      case 'completed':
        return { color: 'bg-green-500', icon: '✓', tooltip: 'Completed' }
      case 'cancelled':
        return { color: 'bg-red-500', icon: '✗', tooltip: 'Cancelled' }
      case 'confirmed':
        return { color: 'bg-blue-400', icon: '✓', tooltip: 'Confirmed' }
      default:
        if (isPast) {
          return { color: 'bg-gray-400', icon: '○', tooltip: 'Not Visited' }
        }
        return { color: 'bg-yellow-500', icon: '○', tooltip: 'Scheduled' }
    }
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter(apt => apt.date === dateStr)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handlePrevDay = () => {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setDate(selectedDate.getDate() - 1)
      setSelectedDate(newDate)
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() - 1)
      setSelectedDate(newDate)
    }
  }

  const handleNextDay = () => {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setDate(selectedDate.getDate() + 1)
      setSelectedDate(newDate)
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() + 1)
      setSelectedDate(newDate)
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Daily View Component
  const DailyView = () => {
    const displayDate = selectedDate || currentDate
    const dateStr = displayDate.toISOString().split('T')[0]
    const dayAppointments = appointments.filter(apt => apt.date === dateStr).sort((a, b) => a.time.localeCompare(b.time))
    const isToday = dateStr === new Date().toISOString().split('T')[0]
    
    const formattedDate = displayDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevDay} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">← Previous Day</button>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-800">{formattedDate}</h3>
            {isToday && <span className="text-sm text-blue-600">Today</span>}
          </div>
          <button onClick={handleNextDay} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Next Day →</button>
        </div>

        <div className="space-y-3">
          {dayAppointments.length > 0 ? (
            dayAppointments.map((apt) => {
              const doctorColor = getDoctorMainColor(apt.doctor_id)
              const statusIndicator = getStatusIndicator(apt.status, apt.date)
              const doctor = doctors.find(d => d.id === apt.doctor_id)
              
              return (
                <div
                  key={apt.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition cursor-pointer ${doctorColor.light} border-l-8 ${doctorColor.border}`}
                  onClick={() => setSelectedAppointment(apt)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className={`w-3 h-3 rounded-full ${statusIndicator.color}`} title={statusIndicator.tooltip}></div>
                        <span className="text-lg font-semibold text-gray-800">{apt.time.slice(0,5)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${doctorColor.text} ${doctorColor.light} border ${doctorColor.border}`}>
                          👨‍⚕️ Dr. {doctor?.first_name} {doctor?.last_name}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-gray-900 text-lg">
                        {apt.patients?.first_name} {apt.patients?.last_name}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="font-medium">{apt.type}</p>
                        </div>
                        {apt.patients?.phone && (
                          <div>
                            <p className="text-gray-500">Phone</p>
                            <p className="font-medium">{apt.patients?.phone}</p>
                          </div>
                        )}
                        {apt.room_number && (
                          <div>
                            <p className="text-gray-500">Room</p>
                            <p className="font-medium">{apt.room_number}</p>
                          </div>
                        )}
                      </div>
                      
                      {apt.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p className="text-gray-500">Notes:</p>
                          <p>{apt.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAppointment(apt)
                      }}
                      className="ml-4 text-blue-600 hover:text-blue-800"
                    >
                      Details →
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Appointments</h3>
              <p className="text-gray-500 mb-4">No appointments scheduled for this day.</p>
              <Link href="/appointments/new" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                + Schedule Appointment
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Month View Component
  const MonthView = () => {
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const daysInMonth = lastDay.getDate()
      const startDayOfWeek = firstDay.getDay()
      
      const days = []
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const prevDate = new Date(year, month, -i)
        days.push({ date: prevDate, isCurrentMonth: false })
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true })
      }
      const remainingDays = 42 - days.length
      for (let i = 1; i <= remainingDays; i++) {
        const nextDate = new Date(year, month + 1, i)
        days.push({ date: nextDate, isCurrentMonth: false })
      }
      return days
    }

    const days = getDaysInMonth(currentDate)

    return (
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center font-medium text-gray-600 py-2 text-sm">{day}</div>
          ))}
          {days.map((day, index) => {
            const dateStr = day.date.toISOString().split('T')[0]
            const dayAppointments = appointments.filter(apt => apt.date === dateStr)
            const isToday = dateStr === new Date().toISOString().split('T')[0]
            
            return (
              <div
                key={index}
                className={`border rounded-lg min-h-[100px] p-1 cursor-pointer hover:shadow-md transition ${!day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'}`}
                onClick={() => {
                  setSelectedDate(day.date)
                  setView('day')
                }}
              >
                <div className={`text-right text-sm p-1 ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center ml-auto' : 'text-gray-600'}`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-1 mt-1">
                  {dayAppointments.slice(0, 3).map(apt => {
                    const doctorColor = getDoctorMainColor(apt.doctor_id)
                    const statusIndicator = getStatusIndicator(apt.status, apt.date)
                    const doctor = doctors.find(d => d.id === apt.doctor_id)
                    
                    return (
                      <div
                        key={apt.id}
                        className={`text-xs p-1 rounded truncate ${doctorColor.bg} text-white group relative`}
                        title={`${apt.time} - Dr. ${doctor?.first_name} ${doctor?.last_name} - ${apt.patients?.first_name} ${apt.patients?.last_name}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">
                            {apt.time.slice(0,5)} {apt.patients?.first_name?.charAt(0)}.{apt.patients?.last_name?.charAt(0)}.
                          </span>
                          <span 
                            className={`w-2 h-2 rounded-full ${statusIndicator.color} ml-1`}
                            title={statusIndicator.tooltip}
                          ></span>
                        </div>
                      </div>
                    )
                  })}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-400 text-center">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading appointments...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Calendar Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={handleToday} className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Today</button>
            {view === 'month' && (
              <>
                <button onClick={handlePrevMonth} className="p-1 px-2 text-gray-600 hover:bg-gray-100 rounded">←</button>
                <button onClick={handleNextMonth} className="p-1 px-2 text-gray-600 hover:bg-gray-100 rounded">→</button>
              </>
            )}
            {view === 'day' && (
              <>
                <button onClick={handlePrevDay} className="p-1 px-2 text-gray-600 hover:bg-gray-100 rounded">←</button>
                <button onClick={handleNextDay} className="p-1 px-2 text-gray-600 hover:bg-gray-100 rounded">→</button>
              </>
            )}
          </div>
          
          <h2 className="text-lg font-semibold">
            {view === 'day' && selectedDate 
              ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            }
          </h2>
          
          <div className="flex gap-2">
            <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded-lg ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
              Month
            </button>
            <button onClick={() => { setView('day'); if (!selectedDate) setSelectedDate(new Date()) }} className={`px-3 py-1 text-sm rounded-lg ${view === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
              Day
            </button>
          </div>
        </div>
      </div>

      {/* Legend - Doctors are main colors, status is small dot */}
      <div className="px-4 pt-3 pb-2 border-b flex flex-wrap gap-4 items-center">
        <span className="text-sm font-medium text-gray-700">Doctors:</span>
        {doctors.map((doctor, idx) => {
          const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500']
          return (
            <div key={doctor.id} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${colors[idx % colors.length]}`} />
              <span className="text-sm text-gray-600">Dr. {doctor.first_name} {doctor.last_name}</span>
            </div>
          )
        })}
        <div className="w-px h-5 bg-gray-300 mx-2"></div>
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-xs text-gray-500">Completed</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs text-gray-500">Cancelled</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-xs text-gray-500">Scheduled</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400"></div><span className="text-xs text-gray-500">Not Visited</span></div>
      </div>

      {/* View Content */}
      {view === 'month' && <MonthView />}
      {view === 'day' && <DailyView />}

      {/* Appointment Details Modal - Keep as is */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800">Appointment Details</h2>
              <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Patient</p>
                <p className="font-medium text-lg">{selectedAppointment.patients?.first_name} {selectedAppointment.patients?.last_name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Doctor</p>
                  <p className="font-medium">{selectedAppointment.users ? `Dr. ${selectedAppointment.users.first_name} ${selectedAppointment.users.last_name}` : 'Not Assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium">{new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time.slice(0,5)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p>{selectedAppointment.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {(() => {
                    const statusIndicator = getStatusIndicator(selectedAppointment.status, selectedAppointment.date)
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${statusIndicator.color}`}>
                        {statusIndicator.tooltip}
                      </span>
                    )
                  })()}
                </div>
                {selectedAppointment.room_number && (
                  <div><p className="text-sm text-gray-500">Room</p><p>{selectedAppointment.room_number}</p></div>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Contact Information</p>
                <p className="text-sm">📞 {selectedAppointment.patients?.phone || 'N/A'}</p>
                <p className="text-sm">✉️ {selectedAppointment.patients?.email || 'N/A'}</p>
              </div>
              
              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Link href={`/patients/${selectedAppointment.patient_id}`} className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700">
                View Full Patient Record
              </Link>
              <button onClick={() => setSelectedAppointment(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}