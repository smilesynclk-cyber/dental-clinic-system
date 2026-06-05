'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/client'

type CurrencyContextType = {
  currency: string
  symbol: string
  format: (amount: number) => string
  setCurrency: (currency: string) => void
  loading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

// Currency configurations
const CURRENCIES: Record<string, { symbol: string, code: string, rate: number }> = {
  LKR: { symbol: 'Rs.', code: 'LKR', rate: 1 },
  USD: { symbol: '$', code: 'USD', rate: 0.0033 },
  EUR: { symbol: '€', code: 'EUR', rate: 0.0031 },
  GBP: { symbol: '£', code: 'GBP', rate: 0.0026 },
  INR: { symbol: '₹', code: 'INR', rate: 0.28 },
  AUD: { symbol: 'A$', code: 'AUD', rate: 0.005 },
  CAD: { symbol: 'C$', code: 'CAD', rate: 0.0045 },
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('LKR')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadCurrency()
  }, [])

  async function loadCurrency() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('clinic_id')
          .eq('email', session.user.email)
          .single()

        if (userData?.clinic_id) {
          const { data: clinic } = await supabase
            .from('clinics')
            .select('currency')
            .eq('id', userData.clinic_id)
            .single()

          if (clinic?.currency) {
            setCurrencyState(clinic.currency)
          }
        }
      }
    } catch (error) {
      console.error('Error loading currency:', error)
    }
    setLoading(false)
  }

  async function setCurrency(newCurrency: string) {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('clinic_id')
          .eq('email', session.user.email)
          .single()

        if (userData?.clinic_id) {
          await supabase
            .from('clinics')
            .update({ currency: newCurrency })
            .eq('id', userData.clinic_id)
        }
      }
      setCurrencyState(newCurrency)
      // Refresh page to apply changes
      window.location.reload()
    } catch (error) {
      console.error('Error updating currency:', error)
    }
    setLoading(false)
  }

  const format = (amount: number): string => {
    if (amount === undefined || amount === null) return `${CURRENCIES[currency]?.symbol || 'Rs.'} 0.00`
    const formattedAmount = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${CURRENCIES[currency]?.symbol || 'Rs.'} ${formattedAmount}`
  }

  return (
    <CurrencyContext.Provider value={{ currency, symbol: CURRENCIES[currency]?.symbol || 'Rs.', format, setCurrency, loading }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}