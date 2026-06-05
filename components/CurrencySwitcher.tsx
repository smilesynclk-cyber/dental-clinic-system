'use client'

import { useCurrency } from '@/lib/currency-context'
import { useState } from 'react'

export default function CurrencySwitcher() {
  const { currency, setCurrency, loading } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)

  const currencies = [
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  ]

  const selectedCurrency = currencies.find(c => c.code === currency) || currencies[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition"
      >
        <span>{selectedCurrency.symbol}</span>
        <span>{currency}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => {
                  setCurrency(curr.code)
                  setIsOpen(false)
                }}
                disabled={loading}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex justify-between items-center ${
                  currency === curr.code ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <span>{curr.code}</span>
                <span className="text-gray-400 text-xs">{curr.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}