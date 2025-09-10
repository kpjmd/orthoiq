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
        
        {/* Mini App Detection and SDK Loading */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Hybrid & SSR-friendly Mini App detection
              (function() {
                const url = new URL(window.location.href);
                const isMiniApp = 
                  url.pathname.startsWith('/mini') ||
                  url.searchParams.get('miniApp') === 'true';
                
                if (isMiniApp) {
                  // Lazy load Mini App SDK
                  console.log('Mini App context detected, loading SDK...');
                  
                  // Skip service worker registration in Mini App context
                  window.__ORTHOIQ_MINI_APP__ = true;
                  
                  // Dynamically import and initialize SDK
                  import('@farcaster/miniapp-sdk').then(({ sdk }) => {
                    console.log('Mini App SDK loaded');
                    window.__FARCASTER_SDK__ = sdk;
                  }).catch(err => {
                    console.error('Failed to load Mini App SDK:', err);
                  });
                } else {
                  // Regular web app - register service worker
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