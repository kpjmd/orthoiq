'use client';

import { useState } from 'react';

interface ActionMenuProps {
  response: string;
  question: string;
  onAskAnother: () => void;
  onViewArtwork: () => void;
  onRate: (rating: number) => void;
  canAskAnother?: boolean;
  questionsRemaining?: number;
}

export default function ActionMenu({ response, question, onAskAnother, onViewArtwork, onRate, canAskAnother = true, questionsRemaining = 0 }: ActionMenuProps) {
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [shareText, setShareText] = useState('Share Response');

  const handleShare = async () => {
    try {
      setShareText('Creating Link...');

      // Create share via API
      const shareResponse = await fetch('/api/share-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          response,
          confidence: 95 // This would come from actual response data
        })
      });

      if (!shareResponse.ok) {
        throw new Error('Failed to create share link');
      }

      const shareData = await shareResponse.json();
      const shareUrl = shareData.shareUrl;
      
      const webShareData = {
        title: 'OrthoIQ AI Response',
        text: `Check out this AI orthopedic response from OrthoIQ by Dr. KPJMD`,
        url: shareUrl
      };

      // Try to use Web Share API if available and supported
      if (navigator.share && navigator.canShare && navigator.canShare(webShareData)) {
        try {
          await navigator.share(webShareData);
          setShareText('Shared!');
        } catch (shareError) {
          console.warn('Web Share API failed, falling back to clipboard:', shareError);
          // If Web Share fails, fallback to clipboard
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareUrl);
            setShareText('Link Copied!');
          } else {
            throw new Error('Neither Web Share API nor Clipboard API is available');
          }
        }
      } else {
        // Fallback: copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
          setShareText('Link Copied!');
        } else {
          // Final fallback: show the share URL to copy manually
          alert(`Please copy this link to share:\n\n${shareUrl}`);
          setShareText('Link Ready!');
        }
      }

      setTimeout(() => setShareText('Share Response'), 2000);
    } catch (error) {
      console.error('Error sharing:', error);
      setShareText('Error sharing');
      setTimeout(() => setShareText('Share Response'), 2000);
    }
  };

  const handleRate = (rating: number) => {
    onRate(rating);
    setHasRated(true);
    setShowRating(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">What would you like to do next?</h4>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAskAnother}
          disabled={!canAskAnother}
          className={`flex items-center justify-center px-4 py-3 rounded-lg transition-colors ${
            canAskAnother 
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span className="mr-2">❓</span>
          {canAskAnother ? 
            `Ask Another${questionsRemaining > 0 ? ` (${questionsRemaining} left)` : ''}` : 
            'Daily Limit Reached'
          }
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <span className="mr-2">📤</span>
          {shareText}
        </button>

        <button
          onClick={onViewArtwork}
          className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <span className="mr-2">🎨</span>
          View Artwork
        </button>

        <button
          onClick={() => setShowRating(!showRating)}
          disabled={hasRated}
          className={`flex items-center justify-center px-4 py-3 rounded-lg transition-colors ${
            hasRated 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          <span className="mr-2">{hasRated ? '✅' : '⭐'}</span>
          {hasRated ? 'Rated' : 'Rate Response'}
        </button>
      </div>

      {showRating && !hasRated && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">How helpful was this response?</p>
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRate(rating)}
                className="text-2xl hover:scale-110 transition-transform"
              >
                ⭐
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}