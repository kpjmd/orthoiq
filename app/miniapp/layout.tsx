import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OrthoIQ - AI Orthopedic Expert',
  description: 'Get expert orthopedic advice from AI founded by KPJMD. Premier medical assistant for bone, joint, and muscle questions.',
  openGraph: {
    title: 'OrthoIQ - AI Orthopedic Expert',
    description: 'Get expert orthopedic advice from AI founded by KPJMD. Premier medical assistant for bone, joint, and muscle questions.',
    images: [
      {
        url: 'https://orthoiq.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OrthoIQ - AI Orthopedic Expert'
      }
    ],
    type: 'website',
  },
  other: {
    'fc:miniapp': JSON.stringify({
      name: 'OrthoIQ - AI Orthopedic Expert',
      icon: 'https://orthoiq.vercel.app/icon.png',
      splashImage: 'https://orthoiq.vercel.app/splash-image.png',
      splashBackgroundColor: '#1e3a8a',
      buttonTitle: 'Ask OrthoIQ'
    }),
    'fc:miniapp:name': 'OrthoIQ - AI Orthopedic Expert',
    'fc:miniapp:icon': 'https://orthoiq.vercel.app/icon.png',
    'fc:miniapp:splash_image': 'https://orthoiq.vercel.app/splash-image.png',
    'fc:miniapp:splash_background_color': '#1e3a8a',
    'fc:miniapp:button_title': 'Ask OrthoIQ'
  }
}

export default function MiniAppLandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}