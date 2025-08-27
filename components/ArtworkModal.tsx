'use client';

import { useState } from 'react';
import ArtworkGenerator, { useMedicalArtwork } from './ArtworkGenerator';
import ArtworkMetadata from './ArtworkMetadata';

interface ArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  response: string;
}

export default function ArtworkModal({ isOpen, onClose, question, response }: ArtworkModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Get artwork data for metadata display
  const artworkData = useMedicalArtwork(question);

  if (!isOpen) return null;

  const shareArtwork = async () => {
    setIsSharing(true);
    setShareStatus('idle');

    try {
      // Create artwork share via API
      const shareResponse = await fetch('/api/share-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          response,
          metadata: artworkData ? {
            generationId: artworkData.seed.hash.substring(0, 16),
            subspecialty: artworkData.analysis.subspecialty,
            emotionalTone: artworkData.analysis.emotionalTone,
            complexityLevel: artworkData.analysis.complexityLevel,
            bodyParts: artworkData.analysis.bodyParts,
            conditions: artworkData.analysis.conditions
          } : null
        })
      });

      if (!shareResponse.ok) {
        throw new Error('Failed to create share link');
      }

      const shareData = await shareResponse.json();
      const shareUrl = shareData.shareUrl;

      // Open Farcaster compose window with the share content
      const farcasterText = encodeURIComponent(`${shareData.farcasterData.text}\n\n${shareUrl}`);
      const farcasterComposeUrl = `https://warpcast.com/compose?text=${farcasterText}`;
      
      window.open(farcasterComposeUrl, '_blank');
      setShareStatus('success');
    } catch (error) {
      console.error('Share failed:', error);
      setShareStatus('error');
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = async () => {
    try {
      // Create artwork share via API
      const shareResponse = await fetch('/api/share-artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          response,
          metadata: artworkData ? {
            generationId: artworkData.seed.hash.substring(0, 16),
            subspecialty: artworkData.analysis.subspecialty,
            emotionalTone: artworkData.analysis.emotionalTone,
            complexityLevel: artworkData.analysis.complexityLevel,
            bodyParts: artworkData.analysis.bodyParts,
            conditions: artworkData.analysis.conditions
          } : null
        })
      });

      if (!shareResponse.ok) {
        throw new Error('Failed to create share link');
      }

      const shareData = await shareResponse.json();
      
      // Try to copy to clipboard with fallback
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.shareUrl);
        setShareStatus('success');
      } else {
        // Fallback for browsers without clipboard API
        alert(`Please copy this link:\n\n${shareData.shareUrl}`);
        setShareStatus('success');
      }
      
      // Reset status after 2 seconds
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      setShareStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Generated Medical Artwork</h2>
            <p className="text-sm text-gray-600 mt-1">
              Uniquely created from your orthopedic question
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Artwork Display */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border">
                <div className="flex justify-center">
                  <ArtworkGenerator 
                    question={question} 
                    size={240}
                    className="drop-shadow-lg"
                  />
                </div>
              </div>

              {/* Question Context */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                  <span className="text-lg mr-2">❓</span>
                  Original Question:
                </h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {question}
                </p>
              </div>
            </div>

            {/* Metadata Panel */}
            <div>
              {artworkData ? (
                <ArtworkMetadata
                  analysis={artworkData.analysis}
                  palette={artworkData.palette}
                  seed={artworkData.seed}
                  question={question}
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center text-gray-500">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>Analyzing artwork...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Share Status */}
          {shareStatus !== 'idle' && (
            <div className={`mt-4 p-3 rounded-lg ${
              shareStatus === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center">
                <span className="mr-2">
                  {shareStatus === 'success' ? '✅' : '❌'}
                </span>
                <span className="text-sm font-medium">
                  {shareStatus === 'success' 
                    ? 'Successfully copied share link to clipboard!' 
                    : 'Failed to share. Please try again.'}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={shareArtwork}
              disabled={isSharing}
              className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSharing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Sharing...
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Share on Farcaster
                </>
              )}
            </button>
            
            <button
              onClick={copyShareLink}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
            >
              <span className="mr-2">🔗</span>
              Copy Share Link
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>

          {/* Farcaster Community Note */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-purple-600 text-lg">💜</span>
              <div className="text-sm">
                <p className="text-purple-800 font-medium">Perfect for Farcaster!</p>
                <p className="text-purple-700 mt-1">
                  This unique medical artwork includes all the metadata that crypto and digital art enthusiasts love. 
                  Each piece is algorithmically generated and completely unique based on your medical question.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}