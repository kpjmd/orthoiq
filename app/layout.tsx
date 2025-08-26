import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OrthoIQ - Ask the Orthopedic AI',
  description: 'AI assistant for orthopedic and sports medicine questions',
  keywords: ['orthopedic', 'sports medicine', 'AI assistant', 'medical questions'],
  authors: [{ name: 'KPJMD' }],
  manifest: '/manifest.json',
  themeColor: '#1e3a8a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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
    icon: '/icon.png',
    apple: '/icon.png',
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
        {/* PWA iOS meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OrthoIQ" />
        <link rel="apple-touch-icon" href="/icon.png" />
        
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