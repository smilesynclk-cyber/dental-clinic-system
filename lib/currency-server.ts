// For server components (can't use hooks)
export const CURRENCIES = {
  LKR: { symbol: 'Rs.', code: 'LKR', rate: 1 },
  USD: { symbol: '$', code: 'USD', rate: 0.0033 },
  EUR: { symbol: '€', code: 'EUR', rate: 0.0031 },
  GBP: { symbol: '£', code: 'GBP', rate: 0.0026 },
  INR: { symbol: '₹', code: 'INR', rate: 0.28 },
}

export function formatCurrency(amount: number, currency: string = 'LKR'): string {
  const curr = CURRENCIES[currency as keyof typeof CURRENCIES] || CURRENCIES.LKR
  if (amount === undefined || amount === null) return `${curr.symbol} 0.00`
  const formattedAmount = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${curr.symbol} ${formattedAmount}`
}