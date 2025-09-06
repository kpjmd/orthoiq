import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getShare } from '../../../lib/database';
import PrescriptionGenerator from '../../../components/PrescriptionGenerator';
import OrthoIQLogo from '../../../components/OrthoIQLogo';

interface SharePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ 
    question?: string
    response?: string 
    confidence?: string
    view?: string
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
  try {
    const shareData = await getShare(shareId);
    if (shareData) {
      question = shareData.question;
      response = shareData.response;
      confidence = shareData.confidence?.toString() || '95';
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
          alt: 'OrthoIQ Medical Prescription'
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
  const viewMode = resolvedSearchParams.view || 'full'; // 'prescription' or 'full'
  
  // Extract stored prescription metadata
  const storedPrescriptionId = shareData?.artworkMetadata?.prescriptionId || shareData?.artwork_metadata?.prescriptionId;
  const storedRarity = shareData?.artworkMetadata?.prescriptionRarity || shareData?.artwork_metadata?.prescriptionRarity;
  const storedTheme = shareData?.artworkMetadata?.prescriptionTheme || shareData?.artwork_metadata?.prescriptionTheme;
  const storedHash = shareData?.artworkMetadata?.prescriptionHash || shareData?.artwork_metadata?.prescriptionHash;
  
  // Extract inquiry and keyPoints from stored data
  const inquiry = shareData?.artworkMetadata?.inquiry || shareData?.artwork_metadata?.inquiry ||
    (typeof question === 'string' && question.length > 60 ? 
      question.substring(0, 60).trim() + "..." : 
      question) || 'Medical consultation inquiry';
  const keyPoints = shareData?.artworkMetadata?.keyPoints || shareData?.artwork_metadata?.keyPoints ||
    (typeof response === 'string' ? 
      response.split(/[.!?]/).filter(s => s.trim().length > 20).slice(0, 4).map(s => s.trim().substring(0, 80)) :
      []) || ['Medical assessment points available'];

  if (!question || !response) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <OrthoIQLogo size="medium" variant="blue" />
            <h1 className="text-3xl font-bold">OrthoIQ</h1>
          </div>
          <p className="text-lg opacity-90">
            {viewMode === 'prescription' ? 'Medical Prescription' : 'AI Medical Prescription'}
          </p>
          <p className="text-sm mt-2 opacity-75">by Dr. KPJMD</p>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* Question - only show in full view mode */}
        {viewMode === 'full' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <span className="text-2xl mr-2">❓</span>
              Question:
            </h2>
            <p className="text-gray-700 leading-relaxed">{question}</p>
          </div>
        )}

        {/* Prescription Display */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-2xl mr-2">📋</span>
            Medical Prescription:
          </h2>
          <div className="flex justify-center mb-4">
            <div className="w-full max-w-4xl">
              <PrescriptionGenerator 
                data={{
                  userQuestion: question,
                  claudeResponse: response,
                  confidence: Number(confidence) / 100 || 0.85,
                  fid: 'shared-user',
                  caseId: shareId,
                  timestamp: shareData?.createdAt || new Date().toISOString(),
                  inquiry: inquiry,
                  keyPoints: keyPoints
                }}
                storedMetadata={storedPrescriptionId ? {
                  id: storedPrescriptionId,
                  rarity: storedRarity,
                  theme: storedTheme,
                  verificationHash: storedHash
                } : undefined}
              />
            </div>
          </div>
        </div>

        {/* Response - only show in full view mode */}
        {viewMode === 'full' && (
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
        )}

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
            <OrthoIQLogo size="small" variant="blue" className="mr-2" />
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