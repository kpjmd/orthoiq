'use client';

import { useState, useEffect, useCallback } from 'react';

interface FeedbackWidgetProps {
  questionId?: string;
  fid?: string;
  isAuthenticated?: boolean;
  onFeedbackSubmitted?: () => void;
}

type HelpfulnessType = 'yes' | 'no' | 'somewhat';

export default function FeedbackWidget({ 
  questionId, 
  fid, 
  isAuthenticated = false, 
  onFeedbackSubmitted 
}: FeedbackWidgetProps) {
  const [feedback, setFeedback] = useState<{
    wasHelpful?: HelpfulnessType;
    aiAnswered: boolean;
    improvementSuggestion: string;
  }>({
    aiAnswered: true,
    improvementSuggestion: ''
  });
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [error, setError] = useState('');

  const checkExistingFeedback = useCallback(async () => {
    if (!questionId || !fid) return;

    try {
      const response = await fetch(`/api/user-feedback?questionId=${questionId}&fid=${fid}`);
      if (response.ok) {
        const existingFeedback = await response.json();
        if (existingFeedback) {
          setFeedback({
            wasHelpful: existingFeedback.was_helpful,
            aiAnswered: existingFeedback.ai_answered,
            improvementSuggestion: existingFeedback.improvement_suggestion || ''
          });
          setIsSubmitted(true);
          if (existingFeedback.was_helpful === 'no' || existingFeedback.was_helpful === 'somewhat') {
            setShowSuggestion(true);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to check existing feedback:', err);
    }
  }, [questionId, fid]);

  // Check if user has already provided feedback for this question
  useEffect(() => {
    if (questionId && fid) {
      checkExistingFeedback();
    }
  }, [questionId, fid, checkExistingFeedback]);

  const handleHelpfulnessChange = (wasHelpful: HelpfulnessType) => {
    setFeedback(prev => ({ ...prev, wasHelpful }));
    setShowSuggestion(wasHelpful === 'no' || wasHelpful === 'somewhat');
    setError('');
  };

  const handleSubmit = async () => {
    if (!questionId || !fid || !feedback.wasHelpful) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/user-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: parseInt(questionId),
          fid,
          wasHelpful: feedback.wasHelpful,
          aiAnswered: feedback.aiAnswered,
          improvementSuggestion: feedback.improvementSuggestion.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setIsSubmitted(true);
      onFeedbackSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!questionId || !fid) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-sm font-medium text-blue-900 mb-3">
        💭 Help us improve OrthoIQ
      </h4>
      
      {!isSubmitted ? (
        <div className="space-y-3">
          {/* Helpfulness Question */}
          <div>
            <p className="text-sm text-blue-800 mb-2">Was this response helpful?</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleHelpfulnessChange('yes')}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  feedback.wasHelpful === 'yes'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
                }`}
              >
                👍 Yes
              </button>
              <button
                onClick={() => handleHelpfulnessChange('no')}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  feedback.wasHelpful === 'no'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
                }`}
              >
                👎 No
              </button>
              <button
                onClick={() => handleHelpfulnessChange('somewhat')}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  feedback.wasHelpful === 'somewhat'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white text-yellow-600 border border-yellow-300 hover:bg-yellow-50'
                }`}
              >
                🤔 Somewhat
              </button>
            </div>
          </div>

          {/* AI Answered Question */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ai-answered"
              checked={!feedback.aiAnswered}
              onChange={(e) => setFeedback(prev => ({ ...prev, aiAnswered: !e.target.checked }))}
              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="ai-answered" className="text-sm text-blue-800">
              The AI didn&apos;t answer my orthopedic question
            </label>
          </div>

          {/* Improvement Suggestion */}
          {showSuggestion && isAuthenticated && (
            <div>
              <label className="block text-sm text-blue-800 mb-1">
                How could this response be improved? (optional)
              </label>
              <textarea
                value={feedback.improvementSuggestion}
                onChange={(e) => setFeedback(prev => ({ 
                  ...prev, 
                  improvementSuggestion: e.target.value.slice(0, 500) 
                }))}
                placeholder="Share your suggestions for improvement..."
                className="w-full p-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-blue-600 mt-1">
                {feedback.improvementSuggestion.length}/500 characters
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Submit Button */}
          {feedback.wasHelpful && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-green-700 font-medium text-sm">✅ Thank you for your feedback!</p>
          <p className="text-blue-700 text-xs mt-1">
            Your input helps us train better AI models for orthopedic care.
          </p>
        </div>
      )}
    </div>
  );
}