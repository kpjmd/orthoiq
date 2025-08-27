'use client';

import { useState } from 'react';
import { useWebAuth } from './WebAuthProvider';
import ArtworkGenerator from './ArtworkGenerator';
import ResponseCard from './ResponseCard';
import ActionMenu from './ActionMenu';
import ArtworkModal from './ArtworkModal';

interface WebOrthoInterfaceProps {
  className?: string;
}

interface ResponseData {
  response: string;
  confidence?: number;
  isFiltered?: boolean;
  isPendingReview?: boolean;
  isApproved?: boolean;
  reviewedBy?: string;
  reviewType?: string;
  hasAdditions?: boolean;
  hasCorrections?: boolean;
  additionsText?: string;
  correctionsText?: string;
}

export default function WebOrthoInterface({ className = "" }: WebOrthoInterfaceProps) {
  const { user, isAuthenticated, signOut, upgradeToEmail, isLoading: authLoading } = useWebAuth();
  const [question, setQuestion] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showArtworkModal, setShowArtworkModal] = useState(false);
  const [dailyQuestions, setDailyQuestions] = useState({ used: 0, limit: 3 });
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradeError, setUpgradeError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError('');
    setResponseData(null);
    setCurrentQuestion(question.trim());

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: question.trim(),
          fid: user?.id || 'web-guest',
          isWebUser: true,
          webUser: user
        }),
      });

      const contentType = res.headers.get('content-type');
      
      if (!res.ok) {
        let errorMessage = `API error (${res.status})`;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          }
        } else {
          const errorText = await res.text();
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setResponseData({
        response: data.response,
        confidence: data.confidence,
        isFiltered: data.isFiltered,
        isPendingReview: data.isPendingReview,
        isApproved: data.isApproved,
        reviewedBy: data.reviewedBy,
        reviewType: data.reviewType,
        hasAdditions: data.hasAdditions,
        hasCorrections: data.hasCorrections,
        additionsText: data.additionsText,
        correctionsText: data.correctionsText
      });
      
      setQuestion('');
      
      // Update daily usage
      setDailyQuestions(prev => ({ ...prev, used: prev.used + 1 }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskAnother = () => {
    setResponseData(null);
    setCurrentQuestion('');
    setError('');
    document.getElementById('web-question')?.focus();
  };

  const handleRate = async (rating: number) => {
    if (!currentQuestion || !user) return;
    
    try {
      await fetch('/api/rate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: user.id,
          question: currentQuestion,
          rating,
          isWebUser: true
        })
      });
    } catch (err) {
      console.warn('Failed to submit rating:', err);
    }
  };

  const handleUpgradeToEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeEmail.trim()) return;

    try {
      setUpgradeError('');
      await upgradeToEmail(upgradeEmail);
      setShowUpgradeForm(false);
      setUpgradeEmail('');
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Upgrade failed');
    }
  };

  const getRemainingQuestions = () => {
    return Math.max(0, dailyQuestions.limit - dailyQuestions.used);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6 rounded-t-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">🦴 OrthoIQ</h2>
          <p className="text-lg opacity-90">Web Experience</p>
          <p className="text-sm mt-2 opacity-75">by Dr. KPJMD</p>
          
          {isAuthenticated && user && (
            <div className="mt-3">
              <p className="text-xs opacity-60">
                Welcome, {user.name}! Questions remaining today: {getRemainingQuestions()} of {dailyQuestions.limit}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-800 bg-opacity-50">
                  {user.authType === 'email' ? '✉️ Email User' : '👤 Guest User'}
                </div>
                {user.authType === 'guest' && (
                  <button
                    onClick={() => setShowUpgradeForm(true)}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-full transition-colors"
                  >
                    Add Email
                  </button>
                )}
                <button
                  onClick={signOut}
                  className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded-full transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Question Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label htmlFor="web-question" className="block text-sm font-medium text-gray-700 mb-2">
              What orthopedic question can I help you with?
            </label>
            <textarea
              id="web-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What should I do for knee pain after running?"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading || getRemainingQuestions() === 0}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !question.trim() || getRemainingQuestions() === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting AI Response...
              </span>
            ) : getRemainingQuestions() === 0 ? (
              'Daily limit reached - Try again tomorrow'
            ) : (
              'Get AI Answer'
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Response Display */}
        {responseData && (
          <div className="mb-6">
            <ResponseCard
              response={responseData.response}
              confidence={responseData.confidence}
              isFiltered={responseData.isFiltered}
              isPendingReview={responseData.isPendingReview}
              isApproved={responseData.isApproved}
              reviewedBy={responseData.reviewedBy}
              reviewType={responseData.reviewType}
              hasAdditions={responseData.hasAdditions}
              hasCorrections={responseData.hasCorrections}
              additionsText={responseData.additionsText}
              correctionsText={responseData.correctionsText}
            />
            
            {/* Action Menu */}
            <ActionMenu
              response={responseData.response}
              question={currentQuestion}
              onAskAnother={handleAskAnother}
              onViewArtwork={() => setShowArtworkModal(true)}
              onRate={handleRate}
              canAskAnother={getRemainingQuestions() > 0}
              questionsRemaining={getRemainingQuestions()}
            />
          </div>
        )}

        {/* Artwork Modal */}
        <ArtworkModal
          isOpen={showArtworkModal}
          onClose={() => setShowArtworkModal(false)}
          question={currentQuestion}
          response={responseData?.response || ''}
        />

        {/* Call to Action */}
        <div className="text-center mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 font-medium mb-2">Want unlimited questions?</p>
          <p className="text-blue-700 text-sm mb-3">
            Get the OrthoIQ miniapp on Farcaster or Base for more features!
          </p>
          <button
            onClick={() => window.open('https://farcaster.xyz/miniapps/12zkRyhWt8Az/orthoiq---ai-orthopedic-expert', '_blank')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span className="mr-2">🔗</span>
            Open in Farcaster
          </button>
        </div>

        {/* Upgrade Form Modal */}
        {showUpgradeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Add Email to Your Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                Adding an email helps us remember your preferences and question history.
              </p>
              
              <form onSubmit={handleUpgradeToEmail}>
                <div className="mb-4">
                  <label htmlFor="upgrade-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="upgrade-email"
                    value={upgradeEmail}
                    onChange={(e) => setUpgradeEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={authLoading}
                    required
                  />
                </div>

                {upgradeError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{upgradeError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpgradeForm(false);
                      setUpgradeEmail('');
                      setUpgradeError('');
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={authLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading || !upgradeEmail.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {authLoading ? 'Adding...' : 'Add Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-500 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium text-yellow-800 mb-1">⚠️ Medical Disclaimer</p>
          <p>
            This AI provides educational information only and should not replace professional medical advice. 
            Always consult with a qualified healthcare provider for medical concerns, diagnosis, or treatment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}