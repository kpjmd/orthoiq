'use client';

import { useState, useEffect } from 'react';
import { useWebAuth } from './WebAuthProvider';
import ResponseCard from './ResponseCard';
import ActionMenu from './ActionMenu';
import PrescriptionModal from './PrescriptionModal';
import OrthoIQLogo from './OrthoIQLogo';
import WebToMiniAppCTA from './WebToMiniAppCTA';
import AgentLoadingCards from './AgentLoadingCards';
import { getWebSessionUsage, generateSessionId } from '@/lib/webTracking';

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
  inquiry?: string;
  keyPoints?: string[];
  questionId?: number;
  enrichments?: any[];
  hasResearch?: boolean;
  userTier?: string;
  // OrthoIQ-Agents integration fields
  dataCompleteness?: number;
  suggestedFollowUp?: string[];
  triageConfidence?: number;
  specialistCoverage?: {
    [specialist: string]: boolean;
  };
  participatingSpecialists?: string[];
  consultationId?: string;
  fromAgentsSystem?: boolean;
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
  // Raw consultation data for enhanced prescription
  rawConsultationData?: any;
}

// Helper function to format structured response objects into readable text
const formatStructuredResponse = (obj: any): string => {
  if (typeof obj === 'string') return obj;
  
  // Handle structured medical response format
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
    
    // If it's a structured object with these fields, format them
    if (sections.length > 0) {
      return sections.join('\n\n');
    }
    
    // For other objects, try to stringify them safely
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return '[Complex response object - please check console for details]';
    }
  }
  
  return String(obj);
};

export default function WebOrthoInterface({ className = "" }: WebOrthoInterfaceProps) {
  const { user, isAuthenticated, isVerified, signOut, upgradeToEmail, isLoading: authLoading, magicLinkSent } = useWebAuth();
  const [question, setQuestion] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  // Limits: 1 for unauthenticated/guest, 10 for verified email users
  const [dailyQuestions, setDailyQuestions] = useState({ used: 0, limit: 1 });
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSentEmail, setUpgradeSentEmail] = useState('');
  const [consultationMode, setConsultationMode] = useState<'fast' | 'normal'>('fast');

  // Web tracking state - limits: 1 for guest, 10 for verified email
  const [webUsage, setWebUsage] = useState({ questionsAsked: 0, questionsRemaining: 1, isLimitReached: false });
  const [showCTA, setShowCTA] = useState(false);
  const [ctaDismissed, setCTADismissed] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  // Scope validation for out-of-scope queries
  const [scopeValidationData, setScopeValidationData] = useState<{
    category: string;
    message: {
      title: string;
      message: string;
      suggestion: string;
    };
    detectedCondition: string;
    confidence: number;
  } | null>(null);

  // Initialize session and fetch web usage on mount and when verification changes
  useEffect(() => {
    generateSessionId(); // Ensures session ID exists
    fetchWebUsage();
  }, [isVerified]);

  // Update question limits based on verification status
  useEffect(() => {
    const limit = isVerified ? 10 : 1;
    setDailyQuestions(prev => ({ ...prev, limit }));
    setWebUsage(prev => ({
      ...prev,
      questionsRemaining: Math.max(0, limit - prev.questionsAsked),
      isLimitReached: prev.questionsAsked >= limit
    }));
  }, [isVerified]);

  // Fetch web usage from API
  const fetchWebUsage = async () => {
    try {
      const usage = await getWebSessionUsage(isVerified);
      setWebUsage(usage);

      // Show soft CTA after first question (if not dismissed)
      if (usage.questionsAsked >= 1 && !usage.isLimitReached && !ctaDismissed) {
        setShowCTA(true);
      }

      // Always show hard limit CTA when limit is reached
      if (usage.isLimitReached) {
        setShowCTA(true);
      }
    } catch (error) {
      console.error('Failed to fetch web usage:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    // Check web usage limit
    if (webUsage.isLimitReached) {
      const limit = isVerified ? 10 : 1;
      setError(`You've reached your ${limit}-question daily limit. ${isVerified ? 'Try again tomorrow!' : 'Verify your email for 10 questions/day or use our Farcaster Mini App for unlimited access!'}`);
      setShowCTA(true);
      return;
    }

    setIsLoading(true);
    setError('');
    setResponseData(null);
    setScopeValidationData(null);
    setCurrentQuestion(question.trim());

    const userTier = user?.authType === 'email' ? 'medical' : 'authenticated';
    console.log(`[WebOrthoInterface] Sending request with tier: ${userTier}, user:`, user);

    try {
      // Get session ID before fetch call to avoid SSR/hydration issues
      const sessionId = generateSessionId();

      // Create AbortController with 120 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          fid: user?.id || 'web-guest',
          tier: userTier,
          isWebUser: true,
          webUser: user,
          mode: consultationMode,
          platform: 'web', // Explicitly set platform for rate limiting
          webSessionId: sessionId // Persistent session ID for guest rate limiting
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

      // Check for scope validation (out-of-scope queries)
      if (data.isOutOfScope && data.scopeValidation) {
        console.log('WebOrthoInterface: Received scope validation response:', data.scopeValidation.category);
        setScopeValidationData(data.scopeValidation);
        setQuestion('');
        setIsLoading(false);
        return;
      }

      // Format the response to ensure it's always a string
      let formattedResponse = data.response;
      
      // Parse JSON response if it's still in JSON format
      try {
        // Only attempt JSON parsing if the response starts with { or [
        if (typeof data.response === 'string' && (data.response.trim().startsWith('{') || data.response.trim().startsWith('['))) {
          const parsed = JSON.parse(data.response);
          if (parsed.response) {
            formattedResponse = formatStructuredResponse(parsed.response);
            console.log('WebOrthoInterface: Successfully extracted response from JSON');
          } else if (typeof parsed === 'string') {
            formattedResponse = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // Handle structured object responses
            formattedResponse = formatStructuredResponse(parsed);
            console.log('WebOrthoInterface: Formatted structured object response');
          }
        } else if (typeof data.response === 'object' && data.response !== null) {
          // Handle case where response is already an object
          formattedResponse = formatStructuredResponse(data.response);
          console.log('WebOrthoInterface: Formatted object response directly');
        }
      } catch (parseError) {
        console.warn('WebOrthoInterface: JSON parsing failed:', parseError);
        // If JSON parsing fails, try regex extraction as fallback
        if (typeof data.response === 'string' && data.response.includes('"response"')) {
          try {
            const jsonMatch = data.response.match(/"response"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
            if (jsonMatch && jsonMatch[1]) {
              formattedResponse = jsonMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
              console.log('WebOrthoInterface: Used regex fallback for malformed JSON');
            }
          } catch {
            console.warn('WebOrthoInterface: Failed to extract response from malformed JSON');
          }
        }
      }
      
      // Final safety check - ensure formattedResponse is always a string
      if (typeof formattedResponse !== 'string') {
        console.warn('WebOrthoInterface: formattedResponse is not a string, formatting as string:', formattedResponse);
        formattedResponse = formatStructuredResponse(formattedResponse);
      }
      
      // Double-check that formatting worked
      if (typeof formattedResponse !== 'string') {
        console.error('WebOrthoInterface: Failed to format response as string, using fallback');
        formattedResponse = 'An error occurred while formatting the response. Please try again.';
      }
      
      setResponseData({
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
        // OrthoIQ-Agents integration fields
        dataCompleteness: data.dataCompleteness,
        suggestedFollowUp: data.suggestedFollowUp,
        triageConfidence: data.triageConfidence,
        specialistCoverage: data.specialistCoverage,
        participatingSpecialists: data.participatingSpecialists,
        consultationId: data.consultationId,
        fromAgentsSystem: data.fromAgentsSystem,
        // Agent coordination data
        specialistConsultation: data.specialistConsultation,
        agentBadges: data.agentBadges || [],
        hasSpecialistConsultation: data.hasSpecialistConsultation || false,
        agentRouting: data.agentRouting,
        agentPerformance: data.agentPerformance,
        agentNetwork: data.agentNetwork,
        // Raw consultation data for enhanced prescription
        rawConsultationData: data.rawConsultationData
      });
      
      setQuestion('');

      // Update daily usage
      setDailyQuestions(prev => ({ ...prev, used: prev.used + 1 }));

      // Refresh web usage after successful submission
      await fetchWebUsage();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskAnother = () => {
    setResponseData(null);
    setScopeValidationData(null);
    setCurrentQuestion('');
    setError('');
    document.getElementById('web-question')?.focus();
  };

  const handleUpgradeToEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeEmail.trim()) return;

    try {
      setUpgradeError('');
      const result = await upgradeToEmail(upgradeEmail);
      if (result.success) {
        setUpgradeSentEmail(upgradeEmail);
      } else {
        setUpgradeError(result.message);
      }
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Upgrade failed');
    }
  };

  const handleCloseUpgradeForm = () => {
    setShowUpgradeForm(false);
    setUpgradeEmail('');
    setUpgradeError('');
    setUpgradeSentEmail('');
  };

  const getRemainingQuestions = () => {
    return Math.max(0, dailyQuestions.limit - dailyQuestions.used);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6 rounded-t-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <OrthoIQLogo size="medium" variant="blue" />
            <h2 className="text-3xl font-bold">OrthoIQ</h2>
          </div>
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
        {/* Consultation Mode Toggle */}
        <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Consultation Mode</h3>
              <p className="text-xs text-gray-600 mt-1">Choose your response speed and depth</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-medium ${consultationMode === 'fast' ? 'text-blue-600' : 'text-gray-400'}`}>
                Fast
              </span>
              <button
                onClick={() => setConsultationMode(consultationMode === 'fast' ? 'normal' : 'fast')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  consultationMode === 'normal' ? 'bg-purple-600' : 'bg-blue-500'
                }`}
                type="button"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    consultationMode === 'normal' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium ${consultationMode === 'normal' ? 'text-purple-600' : 'text-gray-400'}`}>
                Comprehensive
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Fast Mode Card */}
            <div className={`p-3 rounded-lg border-2 transition-all ${
              consultationMode === 'fast'
                ? 'bg-blue-50 border-blue-500 shadow-md'
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center mb-2">
                <span className="text-lg mr-2">⚡</span>
                <span className="font-semibold text-sm">Fast Triage</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">Quick assessment from triage specialist</p>
              <div className="flex items-center text-xs">
                <svg className="w-3 h-3 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-blue-600">~17 seconds</span>
              </div>
            </div>

            {/* Comprehensive Mode Card */}
            <div className={`p-3 rounded-lg border-2 transition-all ${
              consultationMode === 'normal'
                ? 'bg-purple-50 border-purple-500 shadow-md'
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center mb-2">
                <span className="text-lg mr-2">🏥</span>
                <span className="font-semibold text-sm">Multi-Specialist</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">Full consultation with 4-5 specialists</p>
              <div className="flex items-center text-xs">
                <svg className="w-3 h-3 mr-1 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-purple-600">~60 seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Web Conversion CTA */}
        {showCTA && (
          <WebToMiniAppCTA
            questionsRemaining={webUsage.questionsRemaining}
            isHardLimit={webUsage.isLimitReached}
            totalLimit={isVerified ? 10 : 1}
            onDismiss={!webUsage.isLimitReached ? () => {
              setShowCTA(false);
              setCTADismissed(true);
            } : undefined}
          />
        )}

        {/* Question Guidance */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">💡 For best specialist recommendations, include:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your age (e.g., &quot;35 years old&quot;)</li>
            <li>• Pain level from 1-10</li>
            <li>• Activity level (sedentary/moderate/active/athlete)</li>
            <li>• How long you&apos;ve had symptoms</li>
            <li>• What triggers or relieves symptoms</li>
          </ul>

          <p className="text-sm font-semibold text-blue-900 mt-3 mb-2">Example questions:</p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setQuestion("28yo athlete with severe ankle pain (8/10) after basketball, swelling for 3 days")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left block"
            >
              &quot;28yo athlete with severe ankle pain (8/10) after basketball, swelling for 3 days&quot;
            </button>
            <button
              type="button"
              onClick={() => setQuestion("55 year old with moderate knee pain (5/10) when climbing stairs, ongoing for 2 months")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left block"
            >
              &quot;55 year old with moderate knee pain (5/10) when climbing stairs, ongoing for 2 months&quot;
            </button>
            <button
              type="button"
              onClick={() => setQuestion("17yo with shoulder dislocation during football, needs surgery assessment")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left block"
            >
              &quot;17yo with shoulder dislocation during football, needs surgery assessment&quot;
            </button>
          </div>
        </div>

        {/* Expandable Tips Section - Specialist Triggers */}
        <details className="mb-4 group">
          <summary className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg cursor-pointer list-none flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 transition-colors">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🧠</span>
              <span className="text-sm font-semibold text-purple-900">Tips for Better Results</span>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Advanced</span>
            </div>
            <svg className="w-5 h-5 text-purple-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>

          <div className="mt-2 p-4 bg-white border border-purple-200 rounded-lg space-y-4">
            {/* Mind Mender Triggers */}
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">🧠</span>
                <h4 className="font-semibold text-red-900 text-sm">Mind Mender Specialist</h4>
              </div>
              <p className="text-xs text-red-700 mb-2">For psychological aspects of recovery. Mention keywords like:</p>
              <div className="flex flex-wrap gap-1">
                {['anxious', 'worried', 'scared', 'nervous', 'depressed', 'chronic pain', 'months of pain', "can't sleep", 'previous injury', 're-injury fear', 'return to sport', 'athlete', 'competition anxiety', 'post-surgery', 'after surgery'].map(keyword => (
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
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span>💫</span>
                  <h4 className="font-semibold text-purple-900 text-xs">Pain Whisperer</h4>
                </div>
                <p className="text-xs text-purple-700">Analyzes pain patterns, radiating pain, numbness, tingling, triggers</p>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span>🔍</span>
                  <h4 className="font-semibold text-green-900 text-xs">Movement Detective</h4>
                </div>
                <p className="text-xs text-green-700">Analyzes biomechanics, movement patterns, posture, gait issues</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span>💪</span>
                  <h4 className="font-semibold text-amber-900 text-xs">Strength Sage</h4>
                </div>
                <p className="text-xs text-amber-700">Plans rehabilitation, functional restoration, strength building</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span>🏥</span>
                  <h4 className="font-semibold text-blue-900 text-xs">OrthoTriage Master</h4>
                </div>
                <p className="text-xs text-blue-700">Case coordination, urgency assessment, specialist routing</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center italic">
              In comprehensive mode, all 5 specialists analyze your case and stake tokens on their predictions
            </p>
          </div>
        </details>

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
              placeholder="Describe your orthopedic concern. Include: age, pain level (1-10), activity level, and when symptoms started. Example: '45yo runner with knee pain (7/10) for 2 weeks after marathon training'"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading || getRemainingQuestions() === 0}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !question.trim() || getRemainingQuestions() === 0}
            className={`w-full font-medium py-3 px-4 rounded-lg transition-colors ${
              consultationMode === 'normal'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:bg-gray-400 disabled:cursor-not-allowed text-white`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {consultationMode === 'normal'
                  ? 'Consulting specialists (~60s)...'
                  : 'Getting triage assessment (~17s)...'}
              </span>
            ) : getRemainingQuestions() === 0 ? (
              'Daily limit reached - Try again tomorrow'
            ) : (
              <>
                {consultationMode === 'normal' ? '🏥 Get Multi-Specialist Consultation' : '⚡ Get Fast Triage'}
              </>
            )}
          </button>
        </form>

        {/* Agent Loading Cards - Show during loading */}
        {isLoading && (
          <div className="mb-6">
            <AgentLoadingCards
              isLoading={isLoading}
              mode={consultationMode === 'normal' ? 'normal' : 'fast'}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Scope Validation Display - Friendly redirect for out-of-scope queries */}
        {scopeValidationData && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-4xl flex-shrink-0">
                {scopeValidationData.detectedCondition === 'cardiac' ? '❤️' :
                 scopeValidationData.detectedCondition === 'neurological' ? '🧠' :
                 scopeValidationData.detectedCondition === 'gastrointestinal' ? '🩺' :
                 scopeValidationData.detectedCondition === 'respiratory' ? '🫁' :
                 scopeValidationData.detectedCondition === 'dermatological' ? '🧴' :
                 '🏥'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 text-lg mb-2">
                  {scopeValidationData.message.title}
                </h3>
                <p className="text-blue-800 mb-4">
                  {scopeValidationData.message.message}
                </p>
                <div className="p-4 bg-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">💡</span>
                    <p className="text-blue-900 font-medium">
                      {scopeValidationData.message.suggestion}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={handleAskAnother}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Ask an Orthopedic Question
                  </button>
                  <span className="text-sm text-blue-600">
                    OrthoIQ specializes in bones, joints, muscles, and sports medicine
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Response Display */}
        {responseData && (
          <div className="mb-6">
            {/* Data Completeness Indicator */}
            {responseData.dataCompleteness !== undefined && (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Data Completeness Assessment
                  </span>
                  <span className={`text-sm font-semibold ${
                    responseData.dataCompleteness >= 0.8 ? 'text-green-600' :
                    responseData.dataCompleteness >= 0.6 ? 'text-yellow-600' :
                    responseData.dataCompleteness >= 0.3 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {Math.round(responseData.dataCompleteness * 100)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      responseData.dataCompleteness >= 0.8 ? 'bg-green-500' :
                      responseData.dataCompleteness >= 0.6 ? 'bg-yellow-500' :
                      responseData.dataCompleteness >= 0.3 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${responseData.dataCompleteness * 100}%` }}
                  ></div>
                </div>
                
                <p className={`text-xs ${
                  responseData.dataCompleteness >= 0.8 ? 'text-green-700' :
                  responseData.dataCompleteness >= 0.6 ? 'text-yellow-700' :
                  responseData.dataCompleteness >= 0.3 ? 'text-orange-700' : 'text-red-700'
                }`}>
                  {responseData.dataCompleteness >= 0.8 ? '✅ Complete data - full specialist consultation available' :
                   responseData.dataCompleteness >= 0.6 ? '⚠️ Good data - comprehensive assessment provided' :
                   responseData.dataCompleteness >= 0.3 ? '🔍 Partial data - some specialists may be limited' :
                   '📝 Limited data - basic assessment only'}
                </p>
                
                {responseData.fromAgentsSystem && (
                  <div className="mt-2 flex items-center text-xs text-indigo-600">
                    <span className="mr-1">🤖</span>
                    Powered by OrthoIQ Multi-Specialist AI Network
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Questions */}
            {responseData.suggestedFollowUp && responseData.suggestedFollowUp.length > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">💡</span>
                  <h4 className="font-semibold text-purple-800">For Better Results, Please Answer:</h4>
                </div>
                <ul className="space-y-2">
                  {responseData.suggestedFollowUp.map((question, index) => (
                    <li key={index} className="text-sm text-purple-700 bg-white bg-opacity-60 p-2 rounded border-l-3 border-purple-400">
                      • {question}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    const followUpText = responseData.suggestedFollowUp?.join('\n• ') || '';
                    setQuestion(`Based on my previous question: "${currentQuestion}"\n\nHere are additional details:\n• ${followUpText}\n\n`);
                    document.getElementById('web-question')?.focus();
                  }}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  💬 Add These Details to New Question
                </button>
              </div>
            )}

            {/* Specialist Coverage */}
            {responseData.specialistCoverage && Object.keys(responseData.specialistCoverage).length > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">🏥</span>
                  <h4 className="font-semibold text-teal-800">Specialist Coverage</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(responseData.specialistCoverage).map(([specialist, participated]) => (
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
              fid={user?.id || 'web-guest'}
              caseId={`web-${Date.now()}`}
              inquiry={responseData.inquiry}
              keyPoints={responseData.keyPoints}
              questionId={responseData.questionId?.toString()}
              isAuthenticated={isAuthenticated}
              enrichments={responseData.enrichments}
              hasResearch={responseData.hasResearch}
              userTier={responseData.userTier}
              agentCoordination={responseData.agentNetwork ? {
                activeAgents: responseData.agentNetwork.activeAgents,
                totalAgents: responseData.agentNetwork.totalCapacity,
                coordinationType: responseData.agentRouting?.networkExecuted ? 'parallel' : 'sequential',
                networkStatus: (responseData.agentNetwork.activeAgents > 0 && responseData.agentRouting?.networkExecuted) ? 'active' : 'degraded',
                performance: responseData.agentPerformance ? {
                  successRate: responseData.agentPerformance.successRate,
                  avgResponseTime: responseData.agentPerformance.averageExecutionTime
                } : undefined,
                currentLoad: responseData.agentNetwork.currentLoad,
                maxLoad: responseData.agentNetwork.totalCapacity,
                taskRoutes: responseData.agentRouting ? [{
                  from: 'web-user',
                  to: responseData.agentRouting.selectedAgent,
                  reason: responseData.agentRouting.routingReason
                }] : undefined
              } : undefined}
              specialistConsultation={responseData.specialistConsultation}
              agentBadges={responseData.agentBadges}
              hasSpecialistConsultation={responseData.hasSpecialistConsultation}
              rawConsultationData={responseData.rawConsultationData}
              onFeedbackSubmitted={setFeedbackSubmitted}
            />
            
            {/* Action Menu */}
            <ActionMenu
              response={responseData.response}
              question={currentQuestion}
              onAskAnother={handleAskAnother}
              onViewArtwork={() => setShowPrescriptionModal(true)}
              canAskAnother={getRemainingQuestions() > 0}
              questionsRemaining={getRemainingQuestions()}
              inquiry={responseData.inquiry}
              keyPoints={responseData.keyPoints}
              feedbackSubmitted={feedbackSubmitted}
              requiresFeedback={responseData.hasSpecialistConsultation || false}
            />

            {/* Mini App Handoff Prompt - Show for web users without Farcaster auth */}
            {!user?.authType && responseData.consultationId && (
              <div className="mt-6 p-5 bg-gradient-to-r from-purple-50 via-blue-50 to-teal-50 border-2 border-purple-300 rounded-xl shadow-md">
                <div className="flex items-start mb-3">
                  <span className="text-3xl mr-3">🚀</span>
                  <div>
                    <h3 className="font-bold text-purple-900 text-lg">Get the Full OrthoIQ Experience</h3>
                    <p className="text-purple-700 text-sm mt-1">Continue tracking your recovery in the mini app</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-white bg-opacity-70 p-3 rounded-lg border border-purple-200">
                    <div className="text-2xl mb-1">📅</div>
                    <div className="text-xs font-semibold text-purple-900">Milestone Tracking</div>
                    <div className="text-xs text-purple-700">Day 3, 7, 14, 21, 30 check-ins</div>
                  </div>

                  <div className="bg-white bg-opacity-70 p-3 rounded-lg border border-blue-200">
                    <div className="text-2xl mb-1">🪙</div>
                    <div className="text-xs font-semibold text-blue-900">Token Rewards</div>
                    <div className="text-xs text-blue-700">Earn tokens for feedback</div>
                  </div>

                  <div className="bg-white bg-opacity-70 p-3 rounded-lg border border-teal-200">
                    <div className="text-2xl mb-1">🔔</div>
                    <div className="text-xs font-semibold text-teal-900">Smart Reminders</div>
                    <div className="text-xs text-teal-700">Never miss a check-in</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => window.open('https://farcaster.xyz/miniapps/12zkRyhWt8Az/orthoiq---ai-orthopedic-expert', '_blank')}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold text-sm shadow-lg"
                  >
                    🔗 Continue in Mini App
                  </button>
                </div>

                <p className="text-xs text-purple-600 text-center mt-3">
                  Your consultation ID: <span className="font-mono bg-white px-2 py-1 rounded">{responseData.consultationId}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Prescription Modal */}
        <PrescriptionModal
          isOpen={showPrescriptionModal}
          onClose={() => setShowPrescriptionModal(false)}
          question={currentQuestion}
          response={responseData?.response || ''}
          fid={user?.id || 'web-guest'}
          inquiry={responseData?.inquiry}
          keyPoints={responseData?.keyPoints}
          rawConsultationData={responseData?.rawConsultationData}
        />

        {/* Call to Action */}
        <div className="text-center mt-8 p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-teal-50 border-2 border-blue-300 rounded-xl shadow-lg">
          <h3 className="text-blue-900 font-bold text-xl mb-2">🎯 Unlock the Full OrthoIQ Experience</h3>
          <p className="text-blue-700 text-sm mb-4 max-w-2xl mx-auto">
            Get unlimited questions, milestone tracking, token rewards, and personalized recovery guidance in our Farcaster mini app!
          </p>

          <div className="grid md:grid-cols-4 gap-3 mb-5 max-w-3xl mx-auto">
            <div className="bg-white bg-opacity-80 p-3 rounded-lg border border-blue-200">
              <div className="text-2xl mb-1">∞</div>
              <div className="text-xs font-semibold text-blue-900">Unlimited</div>
              <div className="text-xs text-blue-700">Questions</div>
            </div>

            <div className="bg-white bg-opacity-80 p-3 rounded-lg border border-purple-200">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-xs font-semibold text-purple-900">Progress</div>
              <div className="text-xs text-purple-700">Tracking</div>
            </div>

            <div className="bg-white bg-opacity-80 p-3 rounded-lg border border-teal-200">
              <div className="text-2xl mb-1">🎁</div>
              <div className="text-xs font-semibold text-teal-900">Token</div>
              <div className="text-xs text-teal-700">Rewards</div>
            </div>

            <div className="bg-white bg-opacity-80 p-3 rounded-lg border border-indigo-200">
              <div className="text-2xl mb-1">🔔</div>
              <div className="text-xs font-semibold text-indigo-900">Smart</div>
              <div className="text-xs text-indigo-700">Reminders</div>
            </div>
          </div>

          <button
            onClick={() => window.open('https://farcaster.xyz/miniapps/12zkRyhWt8Az/orthoiq---ai-orthopedic-expert', '_blank')}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-bold shadow-lg transform hover:scale-105"
          >
            <span className="mr-2">🚀</span>
            Launch OrthoIQ Mini App
          </button>

          <p className="text-xs text-blue-600 mt-3">
            Available on Farcaster • Free to use • Web3 powered
          </p>
        </div>

        {/* Upgrade Form Modal */}
        {showUpgradeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              {magicLinkSent && upgradeSentEmail ? (
                <>
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Check your email</h3>
                    <p className="text-sm text-gray-600">
                      We sent a magic link to
                    </p>
                    <p className="text-blue-600 font-medium text-sm">{upgradeSentEmail}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 text-center">
                      Click the link in your email to verify. The link expires in 15 minutes.
                    </p>
                  </div>

                  <button
                    onClick={handleCloseUpgradeForm}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Got it
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-4">Add Email to Your Account</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Get 10 questions/day with a verified email address.
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
                        onClick={handleCloseUpgradeForm}
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
                        {authLoading ? 'Sending...' : 'Send Magic Link'}
                      </button>
                    </div>
                  </form>
                </>
              )}
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