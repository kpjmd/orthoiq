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
  isAuthenticated?: boolean;
}

export default function ActionMenu({ response, question, onAskAnother, onViewArtwork, onRate, canAskAnother = true, questionsRemaining = 0, isAuthenticated = false }: ActionMenuProps) {
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [shareText, setShareText] = useState('Share Response');

  const handleShare = async () => {
    // Create a shareable URL with the question and response
    const shareId = Math.random().toString(36).substring(7);
    const shareParams = new URLSearchParams({
      question: question.substring(0, 500),
      response: response.substring(0, 1000),
      confidence: '95' // This would come from actual response data
    });
    
    const shareUrl = `${window.location.origin}/share/${shareId}?${shareParams.toString()}`;
    
    const shareData = {
      title: 'OrthoIQ AI Response',
      text: `Check out this AI orthopedic response from OrthoIQ by Dr. KPJMD`,
      url: shareUrl
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        setShareText('Shared!');
        setTimeout(() => setShareText('Share Response'), 2000);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        setShareText('Link Copied!');
        setTimeout(() => setShareText('Share Response'), 2000);
      }
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

        {isAuthenticated ? (
          <button
            onClick={onViewArtwork}
            className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <span className="mr-2">🎨</span>
            View Artwork
          </button>
        ) : (
          <button
            disabled
            className="flex items-center justify-center px-4 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            title="Sign in to view artwork"
          >
            <span className="mr-2">🔒</span>
            View Artwork
          </button>
        )}

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