import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OrthoIQ Frame',
  description: 'AI-powered orthopedic assistant for Farcaster',
  openGraph: {
    title: 'OrthoIQ - Orthopedic AI Assistant',
    description: 'Ask orthopedic and sports medicine questions powered by AI',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
    }],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': '/og-image.png',
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': 'Ask a Question',
    'fc:frame:button:1:action': 'post',
    'fc:frame:button:1:target': '/frames',
  },
};

export default function FramesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}