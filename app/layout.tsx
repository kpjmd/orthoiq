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
        {/* Cache control meta tags */}
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate, private" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* PWA meta tags - Modern approach */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OrthoIQ" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        
        {/* Mini App detection — sets window.__ORTHOIQ_MINI_APP__ flag read by page.tsx and PrescriptionModal */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var url = new URL(window.location.href);
                var isMiniApp =
                  url.pathname.startsWith('/miniapp') ||
                  url.searchParams.get('miniApp') === 'true';
                if (isMiniApp) {
                  window.__ORTHOIQ_MINI_APP__ = true;
                } else {
                  if ('serviceWorker' in navigator) {
                    window.addEventListener('load', function() {
                      navigator.serviceWorker.register('/sw.js')
                        .then(function(r) { console.log('OrthoIQ SW registered:', r); })
                        .catch(function(e) { console.log('OrthoIQ SW registration failed:', e); });
                    });
                  }
                }
              })();
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