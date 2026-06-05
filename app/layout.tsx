import './globals.css'
import type { Metadata } from 'next'
import LayoutWrapper from '@/components/LayoutWrapper'
import { CurrencyProvider } from '@/lib/currency-context'

export const metadata: Metadata = {
  title: 'Finest Dental Care',
  description: 'Complete practice management solution for dental clinics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <CurrencyProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </CurrencyProvider>
      </body>
    </html>
  )
}