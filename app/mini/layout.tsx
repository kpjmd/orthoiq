import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OrthoIQ - AI Orthopedic Assistant',
  description: 'Premier medical AI mini-app on Farcaster. Get AI-powered orthopedic advice reviewed by Dr. KPJMD.',
  openGraph: {
    title: 'OrthoIQ - AI Orthopedic Assistant',
    description: 'Premier medical AI mini-app on Farcaster. Get AI-powered orthopedic advice reviewed by Dr. KPJMD.',
    images: [
      {
        url: 'https://orthoiq.vercel.app/og-image.png',
        width: 1200,
        height: 800,
        alt: 'OrthoIQ - AI Orthopedic Assistant'
      }
    ],
    type: 'website',
  },
  other: {
    'fc:miniapp': JSON.stringify({
      name: 'OrthoIQ',
      icon: 'https://orthoiq.vercel.app/icon.png',
      splashImage: 'https://orthoiq.vercel.app/og-image.png',
      splashBackgroundColor: '#1e3a8a'
    }),
    'fc:miniapp:name': 'OrthoIQ',
    'fc:miniapp:icon': 'https://orthoiq.vercel.app/icon.png',
    'fc:miniapp:splash_image': 'https://orthoiq.vercel.app/og-image.png',
    'fc:miniapp:splash_background_color': '#1e3a8a'
  }
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}