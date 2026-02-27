'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import ResponseCard from '@/components/ResponseCard';
import ActionMenu from '@/components/ActionMenu';
import PrescriptionModal from '@/components/PrescriptionModal';
import CountdownTimer from '@/components/CountdownTimer';
import NotificationPermissions from '@/components/NotificationPermissions';
import { useAuth } from '@/components/AuthProvider';
import SignInButton from '@/components/SignInButton';
import OrthoIQLogo from '@/components/OrthoIQLogo';
import AgentLoadingCards from '@/components/AgentLoadingCards';
import FeedbackModal from '@/components/FeedbackModal';
import TriageResponseCard from '@/components/TriageResponseCard';
import ComprehensiveLoadingState from '@/components/ComprehensiveLoadingState';
import ConsultationChatbot from '@/components/ConsultationChatbot';
import PROMISQuestionnaire from '@/components/PROMISQuestionnaire';
import { useResearchPolling } from '@/hooks/useResearchPolling';
import { isPainRelatedConsultation } from '@/lib/promis';
import { PROMISCompletionResult } from '@/lib/promisTypes';
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
  inquiry?: string;
  keyPoints?: string[];
  questionId?: number;
  enrichments?: any[];
  hasResearch?: boolean;
  userTier?: string;
  // Agent coordination fields
  specialistConsultation?: {
    consultationId: string;
    participatingSpecialists: string[];
    coordinationSummary: string;
    specialistCount: number;
  };
  agentBadges?: Array<{
    name: string;
    type: string;
    active: boolean;
    specialty: string;
  }>;
  hasSpecialistConsultation?: boolean;
  agentRouting?: {
    selectedAgent: string;
    routingReason: string;
    alternativeAgents: string[];
    networkExecuted: boolean;
  };
  agentPerformance?: {
    executionTime: number;
    successRate: number;
    averageExecutionTime: number;
    totalExecutions: number;
    specialistCount: number;
  };
  agentNetwork?: {
    activeAgents: number;
    totalCapacity: number;
    currentLoad: number;
    networkUtilization: number;
  };
  // Raw consultation data for Intelligence Card generation
  rawConsultationData?: any;
  // OrthoIQ-Agents integration fields
  dataCompleteness?: number;
  suggestedFollowUp?: string[];
  triageConfidence?: number;
  specialistCoverage?: { [specialist: string]: boolean };
  participatingSpecialists?: string[];
  consultationId?: string;
  fromAgentsSystem?: boolean;
  urgencyLevel?: 'emergency' | 'urgent' | 'semi-urgent' | 'routine';
}

type ConsultationStage =
  | 'idle'
  | 'triage_loading'
  | 'triage_complete'
  | 'comprehensive_loading'
  | 'comprehensive_complete'
  | 'exited';

// Helper function to format structured response objects into readable text
const formatStructuredResponse = (obj: any): string => {
  if (typeof obj === 'string') return obj;

  if (obj && typeof obj === 'object') {
    const sections = [];

    if (obj.diagnosis) {
      sections.push(`**Diagnosis:**\n${obj.diagnosis}`);
    }
    if (obj.immediate_actions) {
      sections.push(`**Immediate Actions:**\n${obj.immediate_actions}`);
    }
    if (obj.red_flags) {
      sections.push(`**Red Flags:**\n${obj.red_flags}`);
    }
    if (obj.specialist_recommendation) {
      sections.push(`**Specialist Recommendation:**\n${obj.specialist_recommendation}`);
    }
    if (obj.followup) {
      sections.push(`**Follow-up:**\n${obj.followup}`);
    }
    if (sections.length > 0) {
      return sections.join('\n\n');
    }
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return '[Complex response object - please check console for details]';
    }
  }

  return String(obj);
};

// Extract and format API response data into ResponseData
const parseApiResponse = (data: any): ResponseData => {
  let formattedResponse = data.response;

  try {
    if (typeof data.response === 'string' && (data.response.trim().startsWith('{') || data.response.trim().startsWith('['))) {
      const parsed = JSON.parse(data.response);
      if (parsed.response) {
        formattedResponse = formatStructuredResponse(parsed.response);
      } else if (typeof parsed === 'string') {
        formattedResponse = parsed;
      } else if (parsed && typeof parsed === 'object') {
        formattedResponse = formatStructuredResponse(parsed);
      }
    } else if (typeof data.response === 'object' && data.response !== null) {
      formattedResponse = formatStructuredResponse(data.response);
    }
  } catch (parseError) {
    console.warn('MiniApp: JSON parsing failed:', parseError);
    if (typeof data.response === 'string' && data.response.includes('"response"')) {
      try {
        const jsonMatch = data.response.match(/"response"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (jsonMatch && jsonMatch[1]) {
          formattedResponse = jsonMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
      } catch {
        // ignore
      }
    }
  }

  if (typeof formattedResponse !== 'string') {
    formattedResponse = formatStructuredResponse(formattedResponse);
  }
  if (typeof formattedResponse !== 'string') {
    formattedResponse = 'An error occurred while formatting the response. Please try again.';
  }

  return {
    response: formattedResponse,
    confidence: data.confidence,
    isFiltered: data.isFiltered,
    isPendingReview: data.isPendingReview,
    isApproved: data.isApproved,
    reviewedBy: data.reviewedBy,
    reviewType: data.reviewType,
    hasAdditions: data.hasAdditions,
    hasCorrections: data.hasCorrections,
    additionsText: data.additionsText,
    correctionsText: data.correctionsText,
    inquiry: data.inquiry,
    keyPoints: data.keyPoints,
    questionId: data.questionId,
    enrichments: data.enrichments || [],
    hasResearch: data.hasResearch || false,
    userTier: data.userTier || 'basic',
    dataCompleteness: data.dataCompleteness,
    suggestedFollowUp: data.suggestedFollowUp,
    triageConfidence: data.triageConfidence,
    specialistCoverage: data.specialistCoverage,
    participatingSpecialists: data.participatingSpecialists,
    consultationId: data.consultationId,
    fromAgentsSystem: data.fromAgentsSystem,
    specialistConsultation: data.specialistConsultation,
    agentBadges: data.agentBadges || [],
    hasSpecialistConsultation: data.hasSpecialistConsultation || false,
    agentRouting: data.agentRouting,
    agentPerformance: data.agentPerformance,
    agentNetwork: data.agentNetwork,
    rawConsultationData: data.rawConsultationData,
    urgencyLevel: data.urgencyLevel,
  };
};

function MiniAppContent() {
  const { user: authUser, isAuthenticated } = useAuth();
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FarcasterContext | null>(null);
  const [question, setQuestion] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [consultationStage, setConsultationStage] = useState<ConsultationStage>('idle');
  const [triageResult, setTriageResult] = useState<ResponseData | null>(null);
  const [comprehensiveResult, setComprehensiveResult] = useState<ResponseData | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const isLoading = consultationStage === 'triage_loading' || consultationStage === 'comprehensive_loading';
  const [error, setError] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{remaining: number; total: number; resetTime?: Date; tier?: UserTier} | null>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // PROMIS questionnaire state
  const [showPromisButton, setShowPromisButton] = useState(false);
  const [showPromisQuestionnaire, setShowPromisQuestionnaire] = useState(false);
  const [promisCompleted, setPromisCompleted] = useState(false);
  const [promisResult, setPromisResult] = useState<PROMISCompletionResult | null>(null);
  const [pendingComprehensiveReveal, setPendingComprehensiveReveal] = useState(false);
  const [showTriagePromis, setShowTriagePromis] = useState(false);
  const [triagePromisCompleted, setTriagePromisCompleted] = useState(false);

  // Memoize full caseData so the backend can build precise PubMed queries.
  const researchCaseData = useMemo(() => {
    const raw = comprehensiveResult?.rawConsultationData;
    if (!raw) return undefined;
    const cd = raw.caseData;
    if (!cd) return undefined;
    return {
      primaryComplaint: cd.primaryComplaint || '',
      symptoms: cd.symptoms,
      duration: cd.duration,
      location: cd.location,
      painLevel: cd.painLevel,
      age: cd.age,
      rawQuery: cd.rawQuery,
    };
  }, [comprehensiveResult?.rawConsultationData]);

  // Research polling — gate on comprehensive_complete
  const researchPolling = useResearchPolling({
    enabled: !!(consultationStage === 'comprehensive_complete' && comprehensiveResult?.consultationId),
    consultationId: comprehensiveResult?.consultationId,
    caseData: researchCaseData,
    consultationResult: comprehensiveResult?.rawConsultationData,
    userTier: comprehensiveResult?.userTier,
  });

  // Show PROMIS button after 5s during comprehensive loading
  useEffect(() => {
    if (consultationStage === 'comprehensive_loading' && !promisCompleted) {
      const timer = setTimeout(() => setShowPromisButton(true), 5000);
      return () => clearTimeout(timer);
    }
    if (consultationStage !== 'comprehensive_loading' && consultationStage !== 'comprehensive_complete') {
      setShowPromisButton(false);
    }
  }, [consultationStage, promisCompleted]);

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
    console.log('MiniApp: Starting SDK initialization...');

    // Check if we're in a Mini App context first
    const url = new URL(window.location.href);
    const hasMiniAppParam = url.searchParams.get('miniApp') === 'true';
    const isInFrame = window !== window.top;

    console.log('MiniApp Context Check:');
    console.log('- Has miniApp param:', hasMiniAppParam);
    console.log('- Is in frame:', isInFrame);
    console.log('- Global Mini App flag:', window.__ORTHOIQ_MINI_APP__ || false);

    // Enhanced context detection using SDK
    const checkMiniAppContext = async () => {
      try {
        // Use the pre-loaded SDK if available, otherwise import it
        const sdkInstance = (window.__FARCASTER_SDK__ as typeof sdk) || sdk;
        const isActuallyMiniApp = await sdkInstance.isInMiniApp();
        console.log('- SDK isInMiniApp result:', isActuallyMiniApp);

        // Log context but don't redirect - always show mini app UI
        if (!isActuallyMiniApp && !hasMiniAppParam && !isInFrame) {
          console.log('Not in Farcaster context - but still showing mini app UI');
        }

        return isActuallyMiniApp || isInFrame || hasMiniAppParam;
      } catch (err) {
        console.error('Failed to check Mini App context:', err);
        // Fallback to frame detection
        return isInFrame || hasMiniAppParam;
      }
    };

    // Debug frame context information
    try {
      console.log('MiniApp Debug - Frame Context:');
      console.log('- Current origin:', window.location.origin);
      console.log('- In frame:', isInFrame);
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
      console.error('MiniApp Debug error:', debugError);
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
          console.log('MiniApp: Calling sdk.actions.ready() - Splash screen dismissal');
          sdk.actions.ready();
        } catch (err) {
          console.error('Failed to call sdk.actions.ready():', err);
        }
      }
    };

    // Fallback timer to ensure splash screen is dismissed even if SDK fails
    const fallbackTimer = setTimeout(() => {
      console.log('MiniApp: Fallback timer triggered - ensuring splash screen is dismissed');
      ensureReady();
    }, 3000); // 3 second fallback for faster loading

    const load = async () => {
      try {
        console.log('MiniApp: Loading SDK context...');

        // Check Mini App context (for logging and SDK optimization)
        const isMiniAppContext = await checkMiniAppContext();
        console.log('MiniApp: Context verification result:', isMiniAppContext);

        // Use the pre-loaded SDK if available
        const sdkInstance = (window.__FARCASTER_SDK__ as typeof sdk) || sdk;

        // Add timeout to prevent infinite loading
        const contextPromise = sdkInstance.context;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SDK context timeout after 5 seconds')), 5000)
        );

        const context = await Promise.race([contextPromise, timeoutPromise]) as FarcasterContext;
        console.log('MiniApp: SDK context loaded successfully:', context);

        setContext(context);
        setIsSDKLoaded(true);

        // Clear fallback timer since we succeeded
        clearTimeout(fallbackTimer);

        // Signal that the app is ready
        ensureReady();

        // Load rate limit info and user preferences - always use Farcaster FID
        if (context?.user?.fid) {
          console.log('MiniApp: Loading rate limit status and preferences for FID:', context.user.fid);
          await Promise.all([
            loadRateLimitStatus(context.user.fid.toString(), getUserTier()),
            loadUserPreferences(context.user.fid.toString())
          ]);
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

  // Update rate limit info and preferences when authentication status changes
  useEffect(() => {
    if (isSDKLoaded && context?.user?.fid) {
      const fid = context.user.fid.toString();
      loadRateLimitStatus(fid, getUserTier());
      loadUserPreferences(fid);
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

  const loadUserPreferences = async (fid: string) => {
    try {
      const res = await fetch(`/api/user/preferences?fid=${fid}`);
      if (res.ok) {
        const data = await res.json();
        setUserPreferences(data);

        // Check if returning user
        setIsReturningUser(!data.is_new_user && data.consultation_count > 0);

        console.log('MiniApp: Loaded user preferences:', data);
      }
    } catch (err) {
      console.warn('Failed to load user preferences:', err);
    }
  };

  const saveUserPreference = async (fid: string, preferredMode: 'fast' | 'normal') => {
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, preferred_mode: preferredMode })
      });
      console.log('MiniApp: Saved user preference:', preferredMode);
    } catch (err) {
      console.warn('Failed to save user preference:', err);
    }
  };

  // Stage 1: Triage submit
  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    // Mini app requires Farcaster authentication - no guest mode
    const fid = context?.user?.fid;

    if (!fid) {
      setError('Authentication required. Please refresh the app and try again.');
      return;
    }

    setConsultationStage('triage_loading');
    setError('');
    setTriageResult(null);
    setComprehensiveResult(null);
    setCurrentQuestion(question.trim());

    try {
      // Create AbortController with 120 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          fid: typeof fid === 'number' ? fid.toString() : fid,
          authUser: authUser ? {
            fid: authUser.fid,
            username: authUser.username,
            displayName: authUser.displayName,
            tier: getUserTier()
          } : null,
          tier: getUserTier(),
          mode: 'fast',
          platform: 'miniapp'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      const result = parseApiResponse(data);
      setTriageResult(result);
      setConsultationStage('triage_complete');
      setQuestion('');

      // Count the question only once (not again for comprehensive upgrade)
      const fidString = typeof fid === 'number' ? fid.toString() : fid;
      await loadRateLimitStatus(fidString, getUserTier());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setConsultationStage('idle');
    }
  };

  // Stage 2: Comprehensive upgrade
  const handleComprehensiveUpgrade = async () => {
    // Re-validate FID
    const fid = context?.user?.fid;
    if (!fid) {
      setError('Authentication required. Please refresh the app and try again.');
      return;
    }

    setConsultationStage('comprehensive_loading');
    setError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          fid: typeof fid === 'number' ? fid.toString() : fid,
          authUser: authUser ? {
            fid: authUser.fid,
            username: authUser.username,
            displayName: authUser.displayName,
            tier: getUserTier()
          } : null,
          tier: getUserTier(),
          mode: 'normal',
          platform: 'miniapp'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
        // Fall back to triage_complete on error (preserves triage result)
        setError(errorMessage);
        setConsultationStage('triage_complete');
        return;
      }

      const data = await res.json();
      const result = parseApiResponse(data);
      setComprehensiveResult(result);
      if (showPromisQuestionnaire && !promisCompleted) {
        setPendingComprehensiveReveal(true);
      }
      setConsultationStage('comprehensive_complete');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setConsultationStage('triage_complete');
    }
  };

  // Exit from triage without comprehensive
  const handleTriageExit = () => {
    setConsultationStage('exited');
    setShowFeedbackModal(true);
  };

  const handleAskAnother = () => {
    setConsultationStage('idle');
    setTriageResult(null);
    setComprehensiveResult(null);
    setCurrentQuestion('');
    setError('');
    setShowFeedbackModal(false);
    setFeedbackSubmitted(false);
    setShowPromisButton(false);
    setShowPromisQuestionnaire(false);
    setPromisCompleted(false);
    setPromisResult(null);
    setPendingComprehensiveReveal(false);
    setShowTriagePromis(false);
    setTriagePromisCompleted(false);
    document.getElementById('question')?.focus();
  };

  const handleRate = async (rating: number) => {
    if (!currentQuestion) return;

    const fid = context?.user?.fid;
    if (!fid) return; // Skip rating if not authenticated

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
    // Mini app requires authentication - no guest mode
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
          <p className="text-lg opacity-90">AI Orthopedic Expert</p>
          <p className="text-sm mt-2 opacity-75">by Dr. KPJMD</p>
          <div className="mt-3 space-y-2">
            {/* User Welcome */}
            {context?.user && (
              <div className="text-sm">
                Welcome, {context.user.displayName || context.user.username || `FID ${context.user.fid}`}
              </div>
            )}

            {/* User Info */}
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-2">
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-800 bg-opacity-50">
                  {getUserTier().charAt(0).toUpperCase() + getUserTier().slice(1)} User
                </div>
                {getUserTier() === 'medical' && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-800 bg-opacity-50">
                    ✅ Verified MD
                  </div>
                )}
                <a
                  href="/stats"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-800 bg-opacity-50 hover:bg-opacity-70 transition-colors"
                >
                  📊 Stats
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* Notification Permissions */}
        <NotificationPermissions
          fid={context?.user?.fid?.toString()}
          isAppAdded={context?.client?.added ?? false}
        />

        {/* Question Form */}
        <form onSubmit={handleTriageSubmit} className="mb-6">
          {/* Expandable Question Tips */}
          <details className="mb-4 group">
            <summary className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg cursor-pointer list-none flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 transition-colors">
              <div className="flex items-center space-x-2">
                <span className="text-lg">💡</span>
                <span className="text-sm font-semibold text-purple-900">Tips for Better Results</span>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Advanced</span>
              </div>
              <svg className="w-5 h-5 text-purple-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="mt-2 p-4 bg-white border border-purple-200 rounded-lg space-y-4">
              {/* Basic Tips */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-800 mb-2">For best results, include:</p>
                <ul className="list-disc list-inside text-xs text-blue-700 space-y-0.5">
                  <li>Your age</li>
                  <li>Pain level (1-10)</li>
                  <li>How long you&apos;ve had symptoms</li>
                  <li>What makes it better or worse</li>
                </ul>
              </div>

              {/* Mind Mender Triggers */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">🧠</span>
                  <h4 className="font-semibold text-red-900 text-sm">Mind Mender Specialist</h4>
                </div>
                <p className="text-xs text-red-700 mb-2">For psychological aspects of recovery. Add keywords like:</p>
                <div className="flex flex-wrap gap-1">
                  {['anxious', 'worried', 'scared', 'nervous', 'depressed', 'chronic pain', 'months of pain', "can't sleep", 'previous injury', 're-injury fear', 'return to sport', 'athlete', 'competition anxiety', 'post-surgery'].map(keyword => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => setQuestion(prev => prev ? `${prev}, ${keyword}` : keyword)}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full hover:bg-red-200 transition-colors"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other Specialists */}
              <div className="grid grid-cols-1 gap-2">
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center space-x-2">
                  <span>💫</span>
                  <div>
                    <span className="font-semibold text-purple-900 text-xs">Pain Whisperer</span>
                    <span className="text-xs text-purple-700 ml-1">- pain patterns, radiating, numbness</span>
                  </div>
                </div>
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                  <span>🔍</span>
                  <div>
                    <span className="font-semibold text-green-900 text-xs">Movement Detective</span>
                    <span className="text-xs text-green-700 ml-1">- biomechanics, posture, gait</span>
                  </div>
                </div>
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2">
                  <span>💪</span>
                  <div>
                    <span className="font-semibold text-amber-900 text-xs">Strength Sage</span>
                    <span className="text-xs text-amber-700 ml-1">- rehab, strength, restoration</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center italic">
                After initial triage, you can request a full multi-specialist consultation for a deeper analysis
              </p>
            </div>
          </details>

          {/* Example Questions */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "28yo with ankle pain after basketball",
                "55yo knee pain when climbing stairs",
                "Shoulder pain after lifting weights"
              ].map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuestion(example)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

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
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting triage assessment (~17s)...
              </span>
            ) : (
              'Get Assessment'
            )}
          </button>
        </form>

        {/* Triage loading — fast mode loading cards */}
        {consultationStage === 'triage_loading' && (
          <div className="mb-6">
            <AgentLoadingCards isLoading={true} mode="fast" />
          </div>
        )}

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

        {/* ── TRIAGE COMPLETE ── */}
        {consultationStage === 'triage_complete' && triageResult && (
          <div className="mb-6">
            <TriageResponseCard
              response={triageResult.response}
              confidence={triageResult.confidence}
              urgencyLevel={triageResult.urgencyLevel || 'routine'}
              suggestedFollowUp={triageResult.suggestedFollowUp || []}
              consultationId={triageResult.consultationId}
              onSeeFullAnalysis={handleComprehensiveUpgrade}
              onExit={handleTriageExit}
            />
          </div>
        )}

        {/* ── COMPREHENSIVE LOADING ── */}
        {consultationStage === 'comprehensive_loading' && triageResult && (
          <div className="mb-6">
            <TriageResponseCard
              response={triageResult.response}
              confidence={triageResult.confidence}
              urgencyLevel={triageResult.urgencyLevel || 'routine'}
              suggestedFollowUp={triageResult.suggestedFollowUp || []}
              collapsed={true}
            />
            <ComprehensiveLoadingState />

            {/* PROMIS baseline capture during loading */}
            {showPromisQuestionnaire && !promisCompleted && (
              <div className="mt-4">
                <PROMISQuestionnaire
                  timepoint="baseline"
                  consultationId={triageResult.consultationId || ''}
                  isPainRelated={isPainRelatedConsultation(triageResult.rawConsultationData?.caseData || { rawQuery: currentQuestion })}
                  patientId={context?.user?.fid?.toString() || authUser?.fid?.toString() || 'anonymous'}
                  onComplete={(result) => {
                    setPromisResult(result);
                    setPromisCompleted(true);
                  }}
                  onSkip={() => {
                    setShowPromisQuestionnaire(false);
                    setShowPromisButton(true);
                  }}
                />
              </div>
            )}

            {/* Pulsing "Track Your Recovery" button */}
            {showPromisButton && !showPromisQuestionnaire && !promisCompleted && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setShowPromisQuestionnaire(true);
                    setShowPromisButton(false);
                  }}
                  className="w-full py-3 px-4 bg-white border-2 border-blue-300 rounded-xl text-center transition-all hover:border-blue-400 promis-pulse"
                >
                  <span className="text-sm font-semibold text-blue-700">Track Your Recovery</span>
                  <p className="text-xs text-gray-500 mt-0.5">Complete a 2-minute questionnaire while you wait</p>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── COMPREHENSIVE COMPLETE ── */}
        {consultationStage === 'comprehensive_complete' && comprehensiveResult && (
          <div className="mb-6">
            {/* PROMIS results-ready CTA when questionnaire was active during loading */}
            {pendingComprehensiveReveal && promisCompleted && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <p className="text-sm text-green-800 font-medium mb-2">Your results are ready</p>
                <button
                  onClick={() => setPendingComprehensiveReveal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  View Your Results &rarr;
                </button>
              </div>
            )}

            {/* PROMIS questionnaire inline if started during loading and still active */}
            {showPromisQuestionnaire && !promisCompleted && (
              <div className="mb-4">
                <PROMISQuestionnaire
                  timepoint="baseline"
                  consultationId={comprehensiveResult.consultationId || triageResult?.consultationId || ''}
                  isPainRelated={isPainRelatedConsultation(comprehensiveResult.rawConsultationData?.caseData || { rawQuery: currentQuestion })}
                  patientId={context?.user?.fid?.toString() || authUser?.fid?.toString() || 'anonymous'}
                  onComplete={(result) => {
                    setPromisResult(result);
                    setPromisCompleted(true);
                    setPendingComprehensiveReveal(false);
                  }}
                  onSkip={() => {
                    setShowPromisQuestionnaire(false);
                    setPendingComprehensiveReveal(false);
                  }}
                />
              </div>
            )}

            {/* PROMIS completion summary */}
            {promisCompleted && promisResult && !pendingComprehensiveReveal && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-xs text-green-700">
                  Baseline questionnaire complete — T-Score: {promisResult.scores.physicalFunctionTScore}
                </p>
              </div>
            )}

            {/* Second-chance PROMIS button on structured brief */}
            {!showPromisQuestionnaire && !promisCompleted && !pendingComprehensiveReveal && (
              <div className="mb-4">
                <button
                  onClick={() => setShowPromisQuestionnaire(true)}
                  className="w-full py-3 px-4 bg-white border-2 border-blue-300 rounded-xl text-center transition-all hover:border-blue-400 promis-pulse"
                >
                  <span className="text-sm font-semibold text-blue-700">Track Your Recovery</span>
                  <p className="text-xs text-gray-500 mt-0.5">Complete a 2-minute questionnaire to track your progress over time</p>
                </button>
              </div>
            )}
            {/* Data Completeness Indicator */}
            {comprehensiveResult.dataCompleteness !== undefined && (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Data Completeness Assessment
                  </span>
                  <span className={`text-sm font-semibold ${
                    comprehensiveResult.dataCompleteness >= 0.8 ? 'text-green-600' :
                    comprehensiveResult.dataCompleteness >= 0.6 ? 'text-yellow-600' :
                    comprehensiveResult.dataCompleteness >= 0.3 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {Math.round(comprehensiveResult.dataCompleteness * 100)}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      comprehensiveResult.dataCompleteness >= 0.8 ? 'bg-green-500' :
                      comprehensiveResult.dataCompleteness >= 0.6 ? 'bg-yellow-500' :
                      comprehensiveResult.dataCompleteness >= 0.3 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${comprehensiveResult.dataCompleteness * 100}%` }}
                  ></div>
                </div>

                <p className={`text-xs ${
                  comprehensiveResult.dataCompleteness >= 0.8 ? 'text-green-700' :
                  comprehensiveResult.dataCompleteness >= 0.6 ? 'text-yellow-700' :
                  comprehensiveResult.dataCompleteness >= 0.3 ? 'text-orange-700' : 'text-red-700'
                }`}>
                  {comprehensiveResult.dataCompleteness >= 0.8 ? '✅ Complete data - full specialist consultation available' :
                   comprehensiveResult.dataCompleteness >= 0.6 ? '⚠️ Good data - comprehensive assessment provided' :
                   comprehensiveResult.dataCompleteness >= 0.3 ? '🔍 Partial data - some specialists may be limited' :
                   '📝 Limited data - basic assessment only'}
                </p>

                {comprehensiveResult.fromAgentsSystem && (
                  <div className="mt-2 flex items-center text-xs text-indigo-600">
                    <span className="mr-1">🤖</span>
                    Powered by OrthoIQ Multi-Specialist AI Network
                  </div>
                )}
              </div>
            )}

            {/* Specialist Coverage */}
            {comprehensiveResult.specialistCoverage && Object.keys(comprehensiveResult.specialistCoverage).length > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">🏥</span>
                  <h4 className="font-semibold text-teal-800">Specialist Coverage</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(comprehensiveResult.specialistCoverage).map(([specialist, participated]) => (
                    <div key={specialist} className={`flex items-center text-xs p-2 rounded ${
                      participated ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className="mr-1">{participated ? '✅' : '⭕'}</span>
                      {specialist.charAt(0).toUpperCase() + specialist.slice(1).replace('_', ' ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ResponseCard
              response={comprehensiveResult.response}
              confidence={comprehensiveResult.confidence}
              isFiltered={comprehensiveResult.isFiltered}
              isPendingReview={comprehensiveResult.isPendingReview}
              isApproved={comprehensiveResult.isApproved}
              reviewedBy={comprehensiveResult.reviewedBy}
              reviewType={comprehensiveResult.reviewType}
              hasAdditions={comprehensiveResult.hasAdditions}
              hasCorrections={comprehensiveResult.hasCorrections}
              additionsText={comprehensiveResult.additionsText}
              correctionsText={comprehensiveResult.correctionsText}
              question={currentQuestion}
              fid={context?.user?.fid?.toString() || authUser?.fid?.toString() || ''}
              caseId={`miniapp-${Date.now()}`}
              inquiry={comprehensiveResult.inquiry}
              keyPoints={comprehensiveResult.keyPoints}
              questionId={comprehensiveResult.questionId?.toString()}
              isAuthenticated={!!context?.user?.fid || !!authUser?.fid}
              enrichments={comprehensiveResult.enrichments || []}
              hasResearch={comprehensiveResult.hasResearch || false}
              userTier={comprehensiveResult.userTier || getUserTier()}
              agentCoordination={comprehensiveResult.agentNetwork ? {
                activeAgents: comprehensiveResult.agentNetwork.activeAgents,
                totalAgents: comprehensiveResult.agentNetwork.totalCapacity,
                coordinationType: comprehensiveResult.agentRouting?.networkExecuted ? 'parallel' : 'sequential',
                networkStatus: (comprehensiveResult.agentNetwork.activeAgents > 0 && comprehensiveResult.agentRouting?.networkExecuted) ? 'active' : 'degraded',
                performance: comprehensiveResult.agentPerformance ? {
                  successRate: comprehensiveResult.agentPerformance.successRate,
                  avgResponseTime: comprehensiveResult.agentPerformance.averageExecutionTime
                } : undefined,
                currentLoad: comprehensiveResult.agentNetwork.currentLoad,
                maxLoad: comprehensiveResult.agentNetwork.totalCapacity,
                taskRoutes: comprehensiveResult.agentRouting ? [{
                  from: 'miniapp-user',
                  to: comprehensiveResult.agentRouting.selectedAgent,
                  reason: comprehensiveResult.agentRouting.routingReason
                }] : undefined
              } : undefined}
              specialistConsultation={comprehensiveResult.specialistConsultation}
              agentBadges={comprehensiveResult.agentBadges || []}
              hasSpecialistConsultation={comprehensiveResult.hasSpecialistConsultation || false}
              rawConsultationData={comprehensiveResult.rawConsultationData}
              researchState={researchPolling.researchState}
            />

            {/* Post-consultation chatbot — placed directly below agent responses */}
            {comprehensiveResult.consultationId && (
              <ConsultationChatbot
                consultationId={comprehensiveResult.consultationId}
                consultationContext={{ response: comprehensiveResult.response, rawConsultationData: comprehensiveResult.rawConsultationData }}
                specialistContext="triage"
                userQuestion={currentQuestion}
                fid={context?.user?.fid?.toString() || authUser?.fid?.toString() || ''}
                suggestedFollowUp={comprehensiveResult.suggestedFollowUp || triageResult?.suggestedFollowUp || []}
              />
            )}

            {/* Action Menu */}
            <ActionMenu
              response={comprehensiveResult.response}
              question={currentQuestion}
              onAskAnother={handleAskAnother}
              onViewArtwork={() => setShowPrescriptionModal(true)}
              onRate={handleRate}
              canAskAnother={true}
              inquiry={comprehensiveResult.inquiry}
              keyPoints={comprehensiveResult.keyPoints}
            />
          </div>
        )}

        {/* ── EXITED ── */}
        {consultationStage === 'exited' && (
          <div className="mb-6">
            <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
              <p className="text-3xl mb-3">✅</p>
              <h3 className="font-semibold text-green-900 text-lg mb-2">Thank you for using OrthoIQ!</h3>
              <p className="text-sm text-green-700 mb-4">We hope the triage assessment was helpful.</p>

              {/* Post-consultation chatbot */}
              {triageResult?.consultationId && (
                <div className="text-left mb-4">
                  <ConsultationChatbot
                    consultationId={triageResult.consultationId}
                    consultationContext={{ response: triageResult.response, rawConsultationData: triageResult.rawConsultationData }}
                    specialistContext="triage"
                    userQuestion={currentQuestion}
                    fid={context?.user?.fid?.toString() || authUser?.fid?.toString() || ''}
                    suggestedFollowUp={triageResult.suggestedFollowUp || []}
                  />
                </div>
              )}

              {/* PROMIS opt-in for triage-exit users (after feedback) */}
              {feedbackSubmitted && !showTriagePromis && !triagePromisCompleted && triageResult?.consultationId && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowTriagePromis(true)}
                    className="w-full py-3 px-4 bg-white border-2 border-blue-300 rounded-xl text-center transition-all hover:border-blue-400 promis-pulse"
                  >
                    <span className="text-sm font-semibold text-blue-700">Track Your Recovery</span>
                    <p className="text-xs text-gray-500 mt-0.5">2 minutes &bull; Helps track your progress over time</p>
                  </button>
                </div>
              )}

              {/* PROMIS questionnaire inline for triage-exit */}
              {showTriagePromis && !triagePromisCompleted && triageResult?.consultationId && (
                <div className="text-left mb-4">
                  <PROMISQuestionnaire
                    timepoint="baseline"
                    consultationId={triageResult.consultationId}
                    isPainRelated={isPainRelatedConsultation(triageResult.rawConsultationData?.caseData || { rawQuery: currentQuestion })}
                    patientId={context?.user?.fid?.toString() || authUser?.fid?.toString() || 'anonymous'}
                    onComplete={(result) => {
                      setTriagePromisCompleted(true);
                      setPromisResult(result);
                    }}
                    onSkip={() => setShowTriagePromis(false)}
                  />
                </div>
              )}

              {/* PROMIS completion for triage-exit */}
              {triagePromisCompleted && (
                <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700">Baseline questionnaire complete</p>
                </div>
              )}

              <button
                onClick={handleAskAnother}
                className={`px-6 py-2 rounded-lg transition-colors font-medium ${
                  feedbackSubmitted && !triagePromisCompleted && !showTriagePromis
                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Ask Another Question
              </button>
            </div>
          </div>
        )}

        {/* Prescription Modal */}
        <PrescriptionModal
          isOpen={showPrescriptionModal}
          onClose={() => setShowPrescriptionModal(false)}
          question={currentQuestion}
          response={comprehensiveResult?.response || triageResult?.response || ''}
          fid={context?.user?.fid?.toString() || authUser?.fid?.toString() || ''}
          inquiry={comprehensiveResult?.inquiry || triageResult?.inquiry}
          keyPoints={comprehensiveResult?.keyPoints || triageResult?.keyPoints}
          rawConsultationData={comprehensiveResult?.rawConsultationData || triageResult?.rawConsultationData}
        />

        {/* FeedbackModal for triage exit */}
        {consultationStage === 'exited' && triageResult && (
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            consultationId={triageResult.consultationId || triageResult.specialistConsultation?.consultationId || ''}
            patientId={context?.user?.fid?.toString() || authUser?.fid?.toString() || ''}
            mode="fast"
          />
        )}

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-500 mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="font-medium text-yellow-800 mb-1">⚠️ Medical Disclaimer</p>
          <p>
            This AI provides educational information only and should not replace professional medical advice.
            Always consult with a qualified healthcare provider for medical concerns, diagnosis, or treatment decisions.
          </p>
        </div>

        {/* Platform Information */}
        <details className="mt-4 group">
          <summary className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg cursor-pointer list-none flex items-center justify-between hover:from-indigo-100 hover:to-blue-100 transition-colors">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🤖</span>
              <span className="text-sm font-semibold text-indigo-900">About OrthoIQ AI Platform</span>
            </div>
            <svg className="w-5 h-5 text-indigo-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>

          <div className="mt-2 p-4 bg-white border border-indigo-200 rounded-lg space-y-3 text-sm text-gray-700">
            <div className="flex items-start space-x-3">
              <span className="text-lg">🏥</span>
              <div>
                <p className="font-semibold text-gray-900">Multi-Agent AI System</p>
                <p className="text-xs text-gray-600">5 specialized AI agents collaborate to analyze your orthopedic concerns from different perspectives.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-lg">🪙</span>
              <div>
                <p className="font-semibold text-gray-900">Prediction Market</p>
                <p className="text-xs text-gray-600">Agents stake tokens on their predictions and earn rewards for accuracy, driving continuous improvement.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-lg">👨‍⚕️</span>
              <div>
                <p className="font-semibold text-gray-900">MD Oversight</p>
                <p className="text-xs text-gray-600">All AI responses can be reviewed and validated by licensed physicians for added confidence.</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <a
                href="/stats"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center space-x-1"
              >
                <span>📊</span>
                <span>View Network Statistics & Agent Leaderboard</span>
              </a>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export default function MiniApp() {
  return <MiniAppContent />;
}
