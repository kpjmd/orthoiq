import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getShare } from '../../../lib/database';
import ArtworkGenerator from '../../../components/ArtworkGenerator';

interface SharePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ 
    question?: string
    response?: string 
    confidence?: string
  }>
}

export async function generateMetadata({ params, searchParams }: SharePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const shareId = resolvedParams.id;

  // Try to get data from database first
  let question = 'Orthopedic Question';
  let response = 'AI Response';
  let confidence = '95';
  let isArtwork = false;

  try {
    const shareData = await getShare(shareId);
    if (shareData) {
      question = shareData.question;
      response = shareData.response;
      confidence = shareData.confidence?.toString() || '95';
      isArtwork = shareData.shareType === 'artwork';
    }
  } catch (error) {
    console.error('Error getting share data for metadata:', error);
    // Fallback to URL params if database fails
    question = resolvedSearchParams.question || question;
    response = resolvedSearchParams.response || response;
    confidence = resolvedSearchParams.confidence || confidence;
  }
  
  const embedImageUrl = `/api/og-image?shareId=${shareId}`;

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
          alt: isArtwork ? 'OrthoIQ Medical Artwork' : 'OrthoIQ AI Response'
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
        version: '1',
        imageUrl: embedImageUrl,
        aspectRatio: '3:2',
        button: {
          title: 'Ask OrthoIQ',
          action: {
            type: 'launch_frame',
            name: 'OrthoIQ',
            url: 'https://orthoiq.vercel.app/mini'
          }
        }
      })
    }
  };
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const shareId = resolvedParams.id;

  // Try to get data from database first
  let shareData = null;
  try {
    shareData = await getShare(shareId);
  } catch (error) {
    console.error('Error getting share data:', error);
  }

  // Fallback to URL params if database fails or no data
  const question = shareData?.question || resolvedSearchParams.question;
  const response = shareData?.response || resolvedSearchParams.response;
  const confidence = shareData?.confidence || resolvedSearchParams.confidence;
  const isArtwork = shareData?.shareType === 'artwork';
  const artworkMetadata = shareData?.artworkMetadata || {};

  if (!question || !response) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🦴 OrthoIQ</h1>
          <p className="text-lg opacity-90">
            {isArtwork ? 'AI Medical Artwork' : 'AI Orthopedic Response'}
          </p>
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

        {/* Artwork Display (only for artwork shares) */}
        {isArtwork && artworkMetadata && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <span className="text-2xl mr-2">🎨</span>
              Generated Artwork:
            </h2>
            <div className="flex justify-center mb-4">
              <div className="w-full max-w-md">
                <ArtworkGenerator 
                  question={question}
                  seed={artworkMetadata.generationId || 'shared'}
                  analysis={{
                    subspecialty: artworkMetadata.subspecialty || 'general',
                    emotionalTone: artworkMetadata.emotionalTone || 'neutral',
                    complexityLevel: artworkMetadata.complexityLevel || 5,
                    bodyParts: artworkMetadata.bodyParts || [],
                    conditions: artworkMetadata.conditions || [],
                    treatmentContext: artworkMetadata.treatmentContext || 'general',
                    questionLength: question.length,
                    medicalTermCount: artworkMetadata.medicalTermCount || 0,
                    timeContext: artworkMetadata.timeContext || 'none'
                  }}
                />
              </div>
            </div>
            {/* Artwork Metadata */}
            {(artworkMetadata.subspecialty || artworkMetadata.emotionalTone) && (
              <div className="text-sm text-gray-600 space-y-1">
                {artworkMetadata.subspecialty && (
                  <p><strong>Subspecialty:</strong> {artworkMetadata.subspecialty}</p>
                )}
                {artworkMetadata.emotionalTone && (
                  <p><strong>Emotional Tone:</strong> {artworkMetadata.emotionalTone}</p>
                )}
                {artworkMetadata.complexityLevel && (
                  <p><strong>Complexity:</strong> {artworkMetadata.complexityLevel}/10</p>
                )}
              </div>
            )}
          </div>
        )}

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

        {/* Share Statistics (if from database) */}
        {shareData && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
            <div className="text-sm text-blue-700 text-center">
              <p>👀 Viewed {shareData.viewCount} times</p>
              <p className="text-xs mt-1 text-blue-600">
                Shared on {new Date(shareData.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

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