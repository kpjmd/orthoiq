import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OrthoIQ - Ask the Orthopedic AI',
  description: 'AI assistant for orthopedic and sports medicine questions',
  keywords: ['orthopedic', 'sports medicine', 'AI assistant', 'medical questions'],
  authors: [{ name: 'KPJMD' }],
  openGraph: {
    title: 'OrthoIQ - Ask the Orthopedic AI',
    description: 'AI assistant for orthopedic and sports medicine questions',
    siteName: 'OrthoIQ',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OrthoIQ - Ask the Orthopedic AI',
    description: 'AI assistant for orthopedic and sports medicine questions',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}