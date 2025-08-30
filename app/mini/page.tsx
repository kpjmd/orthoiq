'use client';

import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import ResponseCard from '@/components/ResponseCard';
import ActionMenu from '@/components/ActionMenu';
import PrescriptionModal from '@/components/PrescriptionModal';
import CountdownTimer from '@/components/CountdownTimer';
import NotificationPermissions from '@/components/NotificationPermissions';
import { useAuth } from '@/components/AuthProvider';
import SignInButton from '@/components/SignInButton';
import OrthoIQLogo from '@/components/OrthoIQLogo';
import { UserTier } from '@/lib/rateLimit';

// Farcaster SDK Context Types
interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  verifications?: string[];
}

interface FarcasterContext {
  user?: FarcasterUser;
  location?: {
    pathname: string;
    search: string;
    hash: string;
  };
  client?: {
    added: boolean;
    safeAreaInsets: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
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

function MiniAppContent() {
  const { user: authUser, isAuthenticated } = useAuth();
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FarcasterContext | null>(null);
  const [question, setQuestion] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{remaining: number; total: number; resetTime?: Date; tier?: UserTier} | null>(null);

  const getUserTier = useCallback((): UserTier => {
    // Prioritize authUser from Quick Auth
    if (isAuthenticated && authUser) {
      // Check if user is verified medical professional
      if (authUser.verifications && authUser.verifications.length > 0) {
        return 'medical';
      }
      return 'authenticated';
    }
    // All Farcaster users start as basic tier
    return 'basic';
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    console.log('Mini App: Starting SDK initialization...');
    
    // Debug frame context information
    try {
      console.log('Mini App Debug - Frame Context:');
      console.log('- Current origin:', window.location.origin);
      console.log('- In frame:', window !== window.top);
      console.log('- Parent available:', window.parent !== window);
      console.log('- Document referrer:', document.referrer);
      console.log('- User agent:', navigator.userAgent);
      
      // Try to get parent info (will likely be blocked)
      try {
        console.log('- Parent origin:', window.parent.location.origin);
      } catch (e) {
        console.log('- Parent origin blocked (expected):', e instanceof Error ? e.message : 'Unknown error');
      }
    } catch (debugError) {
      console.error('Mini App Debug error:', debugError);
    }
    
    // Preconnect to Quick Auth server for better performance
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://auth.farcaster.xyz';
    document.head.appendChild(link);

    // Set up fallback splash screen dismissal
    let readyCalled = false;
    const ensureReady = () => {
      if (!readyCalled) {
        readyCalled = true;
        try {
          console.log('Mini App: Calling sdk.actions.ready() - Splash screen dismissal');
          sdk.actions.ready();
        } catch (err) {
          console.error('Failed to call sdk.actions.ready():', err);
        }
      }
    };

    // Fallback timer to ensure splash screen is dismissed even if SDK fails
    const fallbackTimer = setTimeout(() => {
      console.log('Mini App: Fallback timer triggered - ensuring splash screen is dismissed');
      ensureReady();
    }, 8000); // 8 second fallback

    const load = async () => {
      try {
        console.log('Mini App: Loading SDK context...');
        
        // Add timeout to prevent infinite loading
        const contextPromise = sdk.context;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SDK context timeout after 8 seconds')), 8000)
        );
        
        const context = await Promise.race([contextPromise, timeoutPromise]) as FarcasterContext;
        console.log('Mini App: SDK context loaded successfully:', context);
        
        setContext(context);
        setIsSDKLoaded(true);
        
        // Clear fallback timer since we succeeded
        clearTimeout(fallbackTimer);
        
        // Signal that the app is ready
        ensureReady();
        
        // Load rate limit info - always use Farcaster FID
        if (context?.user?.fid) {
          console.log('Mini App: Loading rate limit status for FID:', context.user.fid);
          await loadRateLimitStatus(context.user.fid.toString(), getUserTier());
        }
      } catch (err) {
        console.error('Error loading Farcaster SDK:', err);
        setError(`Failed to initialize Mini App: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Clear fallback timer and ensure ready is called
        clearTimeout(fallbackTimer);
        
        // Still call ready() even on error to dismiss splash screen
        ensureReady();
        
        // Set SDK as loaded even on error to show the interface
        setIsSDKLoaded(true);
        
        // Create a mock context for basic functionality
        setContext({
          user: undefined,
          location: {
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash
          }
        });
      }
    };

    load();

    // Cleanup function
    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [getUserTier, authUser]);

  // Update rate limit info when authentication status changes
  useEffect(() => {
    if (isSDKLoaded && context?.user?.fid) {
      loadRateLimitStatus(context.user.fid.toString(), getUserTier());
    }
  }, [isAuthenticated, authUser, context, getUserTier, isSDKLoaded]);

  const loadRateLimitStatus = async (fid: string, tier: UserTier = 'basic') => {
    try {
      const res = await fetch(`/api/rate-limit-status?fid=${fid}&tier=${tier}`);
      if (res.ok) {
        const data = await res.json();
        setRateLimitInfo({
          remaining: data.remaining,
          total: data.dailyLimit,
          resetTime: data.resetTime ? new Date(data.resetTime) : undefined,
          tier: data.tier
        });
      }
    } catch (err) {
      console.warn('Failed to load rate limit status:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !context?.user?.fid) return;
    
    // Use Farcaster FID for all users
    const fid = context.user.fid;

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
          fid: fid.toString(),
          authUser: authUser ? {
            fid: authUser.fid,
            username: authUser.username,
            displayName: authUser.displayName,
            tier: getUserTier()
          } : null,
          tier: getUserTier()
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
      
      // Update rate limit info
      await loadRateLimitStatus(fid.toString(), getUserTier());
      
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
    document.getElementById('question')?.focus();
  };

  const handleRate = async (rating: number) => {
    if (!currentQuestion || !context?.user?.fid) return;
    
    const fid = context.user.fid;

    try {
      await fetch('/api/rate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: fid.toString(),
          question: currentQuestion,
          rating
        })
      });
    } catch (err) {
      console.warn('Failed to submit rating:', err);
    }
  };


  const getRemainingQuestions = () => {
    return rateLimitInfo ? rateLimitInfo.remaining : 0;
  };

  const getUsedQuestions = () => {
    return rateLimitInfo ? rateLimitInfo.total - rateLimitInfo.remaining : 0;
  };

  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg mb-2">Loading OrthoIQ...</p>
          <p className="text-sm opacity-75">Initializing Farcaster Mini App SDK</p>
          {error && (
            <div className="mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <OrthoIQLogo size="medium" variant="blue" className="text-white" />
            <h1 className="text-3xl font-bold">OrthoIQ</h1>
          </div>
          <p className="text-lg opacity-90">Premier Medical AI on Farcaster</p>
          <p className="text-sm mt-2 opacity-75">by Dr. KPJMD</p>
          <div className="mt-3 space-y-2">
            {/* Authentication Status */}
            <div className="flex justify-center">
              <SignInButton />
            </div>
            
            {/* User Info */}
            <div className="space-y-1">
              <p className="text-xs opacity-60">
                Questions remaining today: {getRemainingQuestions()}
                {rateLimitInfo?.total && ` of ${rateLimitInfo.total}`}
              </p>
              {getRemainingQuestions() === 0 && rateLimitInfo?.resetTime && (
                <p className="text-xs opacity-60">
                  Resets at midnight UTC in: <CountdownTimer 
                    targetTime={rateLimitInfo.resetTime} 
                    onComplete={() => {
                      if (context?.user?.fid) {
                        loadRateLimitStatus(context.user.fid.toString(), getUserTier());
                      }
                    }} 
                  />
                </p>
              )}
              <div className="flex items-center justify-center space-x-2">
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-800 bg-opacity-50">
                  {getUserTier().charAt(0).toUpperCase() + getUserTier().slice(1)} User
                </div>
                {getUserTier() === 'medical' && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-800 bg-opacity-50">
                    ✅ Verified
                  </div>
                )}
                {(isAuthenticated && authUser) ? (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-700 bg-opacity-50">
                    ✅ Authenticated
                  </div>
                ) : (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-700 bg-opacity-50">
                    👤 Basic User
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* Notification Permissions */}
        <NotificationPermissions 
          fid={context?.user?.fid?.toString()} 
        />

        {/* Question Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              What orthopedic question can I help you with?
            </label>
            <textarea
              id="question"
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
              'Daily limit reached - Resets at midnight UTC'
            ) : (
              'Get AI Answer'
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            {error.includes('Daily limit reached') && rateLimitInfo?.resetTime && (
              <p className="text-red-600 text-sm mt-2">
                Questions reset at midnight UTC in: <CountdownTimer 
                  targetTime={rateLimitInfo.resetTime} 
                  onComplete={() => {
                    if (context?.user?.fid) {
                      loadRateLimitStatus(context.user.fid.toString(), getUserTier());
                    }
                  }} 
                />
              </p>
            )}
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
              question={currentQuestion}
              fid={context?.user?.fid.toString() || authUser?.fid.toString() || 'guest'}
              caseId={`mini-${Date.now()}`}
            />
            
            {/* Action Menu */}
            <ActionMenu
              response={responseData.response}
              question={currentQuestion}
              onAskAnother={handleAskAnother}
              onViewArtwork={() => setShowPrescriptionModal(true)}
              onRate={handleRate}
              canAskAnother={getRemainingQuestions() > 0}
              questionsRemaining={getRemainingQuestions()}
            />
          </div>
        )}

        {/* Prescription Modal */}
        <PrescriptionModal
          isOpen={showPrescriptionModal}
          onClose={() => setShowPrescriptionModal(false)}
          question={currentQuestion}
          response={responseData?.response || ''}
          fid={context?.user?.fid.toString() || authUser?.fid.toString() || 'guest'}
        />

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-500 mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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

export default function MiniApp() {
  return <MiniAppContent />;
}