'use client';

import { useState } from 'react';

interface ActionMenuProps {
  response: string;
  question: string;
  onAskAnother: () => void;
  onViewArtwork: () => void; // Keep name for backward compatibility but will show "View Prescription"
  onRate?: (rating: number) => void;
  canAskAnother?: boolean;
  questionsRemaining?: number;
  inquiry?: string;
  keyPoints?: string[];
  confidence?: number;
  prescriptionMetadata?: any;
  feedbackSubmitted?: boolean; // Track if feedback has been submitted for comprehensive mode
  requiresFeedback?: boolean; // Whether this consultation requires feedback to unlock prescription
}

export default function ActionMenu({ response, question, onAskAnother, onViewArtwork, onRate, canAskAnother = true, questionsRemaining = 0, inquiry, keyPoints, confidence = 85, prescriptionMetadata, feedbackSubmitted = true, requiresFeedback = false }: ActionMenuProps) {
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
          confidence, // Use actual confidence value
          inquiry,
          keyPoints,
          prescriptionMetadata // Include prescription metadata if available
        })
      });

      if (!shareResponse.ok) {
        throw new Error('Failed to create share link');
      }

      const shareData = await shareResponse.json();
      const shareUrl = shareData.shareUrl;
      
      const shareText = `Just asked OrthoIQ: "${question.substring(0, 80)}${question.length > 80 ? '...' : ''}" 🦴 Get AI-powered orthopedic insights reviewed by a board-certified surgeon!`;
      
      const webShareData = {
        title: 'OrthoIQ Medical Insight',
        text: shareText,
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
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            setShareText('Copied to Clipboard!');
          } else {
            throw new Error('Neither Web Share API nor Clipboard API is available');
          }
        }
      } else {
        // Fallback: copy to clipboard with text
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
          setShareText('Copied to Clipboard!');
        } else {
          // Final fallback: show the share URL to copy manually
          alert(`Please copy this to share:\n\n${shareText}\n\n${shareUrl}`);
          setShareText('Ready to Share!');
        }
      }

      setTimeout(() => setShareText('Share Response'), 2000);
    } catch (error) {
      console.error('Error sharing:', error);
      setShareText('Error sharing');
      setTimeout(() => setShareText('Share Response'), 2000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">What would you like to do next?</h4>

      <div className="mb-4">
        <button
          onClick={onAskAnother}
          disabled={!canAskAnother}
          className={`w-full flex items-center justify-center px-4 py-3 rounded-lg transition-colors ${
            canAskAnother
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span className="mr-2">❓</span>
          {canAskAnother ?
            `Ask Another Question${questionsRemaining > 0 ? ` (${questionsRemaining} left)` : ''}` :
            'Daily Limit Reached'
          }
        </button>
      </div>

      {/* Enhanced Sharing Options */}
      <div className="border-t pt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-3">Share this medical insight:</h5>
        <div className="mb-3">
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <span className="mr-2">📤</span>
            {shareText}
          </button>
        </div>
      </div>
    </div>
  );
}