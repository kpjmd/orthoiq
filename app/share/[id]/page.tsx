import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface SharePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ 
    question?: string
    response?: string 
    confidence?: string
  }>
}

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const question = resolvedSearchParams.question || 'Orthopedic Question';
  const response = resolvedSearchParams.response || 'AI Response';
  const confidence = resolvedSearchParams.confidence || '95';
  
  const embedImageUrl = `/api/embed?${new URLSearchParams({
    question: question.substring(0, 200),
    response: response.substring(0, 300),
    confidence
  }).toString()}`;

  const title = `OrthoIQ: ${question.substring(0, 60)}${question.length > 60 ? '...' : ''}`;
  const description = `AI Response: ${response.substring(0, 150)}${response.length > 150 ? '...' : ''}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: embedImageUrl,
          width: 1200,
          height: 800,
          alt: 'OrthoIQ AI Response'
        }
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [embedImageUrl],
    },
    other: {
      'fc:miniapp': JSON.stringify({
        name: 'OrthoIQ',
        icon: 'https://orthoiq.vercel.app/icon.png',
        splashImage: embedImageUrl,
        splashBackgroundColor: '#1e3a8a',
        button: 'Ask OrthoIQ'
      }),
      'fc:miniapp:name': 'OrthoIQ',
      'fc:miniapp:icon': 'https://orthoiq.vercel.app/icon.png',
      'fc:miniapp:splash_image': embedImageUrl,
      'fc:miniapp:splash_background_color': '#1e3a8a',
      'fc:miniapp:button': 'Ask OrthoIQ'
    }
  };
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const resolvedSearchParams = await searchParams;
  const question = resolvedSearchParams.question;
  const response = resolvedSearchParams.response;
  const confidence = resolvedSearchParams.confidence;

  if (!question || !response) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🦴 OrthoIQ</h1>
          <p className="text-lg opacity-90">AI Orthopedic Response</p>
          <p className="text-sm mt-2 opacity-75">by Dr. KPJMD</p>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* Question */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-2xl mr-2">❓</span>
            Question:
          </h2>
          <p className="text-gray-700 leading-relaxed">{question}</p>
        </div>

        {/* Response */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <span className="text-2xl mr-2">🔬</span>
              OrthoIQ Response:
            </h2>
            {confidence && (
              <div className="text-sm text-gray-600">
                Confidence: {confidence}%
              </div>
            )}
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <a
            href="/mini"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span className="mr-2">🦴</span>
            Ask Your Own Question
          </a>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-500 mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium text-yellow-800 mb-1">⚠️ Medical Disclaimer</p>
          <p>
            This AI provides educational information only and should not replace professional medical advice. 
            Always consult with a qualified healthcare provider for medical concerns.
          </p>
        </div>
      </div>
    </div>
  );
}