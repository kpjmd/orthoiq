import type { Metadata } from 'next'
import { AuthProvider } from '@/components/AuthProvider';

const host = process.env.NEXT_PUBLIC_HOST || 'https://orthoiq.vercel.app';

export const metadata: Metadata = {
  title: 'AequOs - AI Orthopedic Expert',
  description: 'Get expert orthopedic advice from AI founded by KPJMD. Premier medical assistant for bone, joint, and muscle questions.',
  openGraph: {
    title: 'AequOs - AI Orthopedic Expert',
    description: 'Get expert orthopedic advice from AI founded by KPJMD. Premier medical assistant for bone, joint, and muscle questions.',
    images: [
      {
        url: `${host}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'AequOs - AI Orthopedic Expert'
      }
    ],
    type: 'website',
  },
  other: {
    'fc:miniapp': JSON.stringify({
      name: 'AequOs - AI Orthopedic Expert',
      icon: `${host}/icon.png`,
      splashImage: `${host}/splash-image1.png`,
      splashBackgroundColor: '#1e3a8a',
      buttonTitle: 'Ask AequOs'
    }),
    'fc:miniapp:name': 'AequOs - AI Orthopedic Expert',
    'fc:miniapp:icon': `${host}/icon.png`,
    'fc:miniapp:splash_image': `${host}/splash-image1.png`,
    'fc:miniapp:splash_background_color': '#1e3a8a',
    'fc:miniapp:button_title': 'Ask AequOs'
  }
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}