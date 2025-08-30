import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e3a8a',
}

export const metadata: Metadata = {
  title: 'OrthoIQ - Ask the Orthopedic AI',
  description: 'AI assistant for orthopedic and sports medicine questions',
  keywords: ['orthopedic', 'sports medicine', 'AI assistant', 'medical questions'],
  authors: [{ name: 'KPJMD' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OrthoIQ',
  },
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
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA meta tags - Modern approach */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OrthoIQ" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('OrthoIQ SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('OrthoIQ SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}