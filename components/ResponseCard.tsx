'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MDReviewUpgrade from './MDReviewUpgrade';
import IntelligenceCardModal from './IntelligenceCardModal';
import SpecialistBadge from './SpecialistBadge';
import ConsultationProgressBar from './ConsultationProgressBar';
import CoordinationMetadata from './CoordinationMetadata';
import FeedbackModal from './FeedbackModal';
import TokenRewards from './TokenRewards';
import IntelligenceCardCTA from './IntelligenceCardCTA';
import WebIntelligenceCard from './WebIntelligenceCard';
import ClientOnly from './ClientOnly';
import { PrescriptionData, PrescriptionMetadata, AgentEnrichment } from '@/lib/types';
import { exportPrescription } from '@/lib/exportUtils';
import { mapConsultationToCardData } from '@/lib/intelligenceCardUtils';

interface AgentCoordinationData {
  activeAgents?: number;
  totalAgents?: number;
  coordinationType?: 'distributed' | 'sequential' | 'parallel';
  networkStatus?: 'active' | 'degraded' | 'error';
  performance?: {
    successRate: number;
    avgResponseTime: number;
  };
  currentLoad?: number;
  maxLoad?: number;
  taskRoutes?: Array<{
    from: string;
    to: string;
    reason: string;
  }>;
}

interface ResponseCardProps {
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
  question?: string;
  fid?: string;
  caseId?: string;
  inquiry?: string;
  keyPoints?: string[];
  questionId?: string;
  isAuthenticated?: boolean;
  enrichments?: AgentEnrichment[];
  hasResearch?: boolean;
  userTier?: string;
  agentCoordination?: AgentCoordinationData;
  // Specialist consultation props
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
  // Raw consultation data for enhanced prescription
  rawConsultationData?: any;
  // Callback for when feedback is submitted
  onFeedbackSubmitted?: (submitted: boolean) => void;
}

export default function ResponseCard({
  response,
  confidence,
  isFiltered = false,
  isPendingReview = false,
  isApproved = false,
  reviewedBy,
  reviewType,
  hasAdditions = false,
  hasCorrections = false,
  additionsText,
  correctionsText,
  question,
  fid,
  caseId,
  inquiry,
  keyPoints,
  questionId,
  isAuthenticated = false,
  enrichments = [],
  hasResearch = false,
  userTier = 'basic',
  agentCoordination,
  specialistConsultation,
  agentBadges = [],
  hasSpecialistConsultation = false,
  rawConsultationData,
  onFeedbackSubmitted
}: ResponseCardProps) {
  // Debug logging for rawConsultationData
  console.log('[ResponseCard] rawConsultationData received:', rawConsultationData);
  console.log('[ResponseCard] rawConsultationData?.responses:', rawConsultationData?.responses?.length);

  const [showConfidence, setShowConfidence] = useState(false);
  const [prescriptionMetadata, setPrescriptionMetadata] = useState<PrescriptionMetadata | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{
    hasPaymentRequest: boolean;
    paymentStatus?: string;
    paymentId?: string;
    inReviewQueue: boolean;
  } | null>(null);
  const prescriptionRef = useRef<SVGSVGElement>(null);
  const [consultationStage, setConsultationStage] = useState<'instant' | 'coordinating' | 'analyzing' | 'complete'>('instant');
  const [completedSpecialists, setCompletedSpecialists] = useState(0);

  // Feedback system state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [tokenRewards, setTokenRewards] = useState<Array<{agent: string; reward: number; accuracy: number}>>([]);
  const [expandedSpecialists, setExpandedSpecialists] = useState<Set<number>>(new Set());

  // Intelligence Card modal state
  const [showIntelligenceCardModal, setShowIntelligenceCardModal] = useState(false);

  // Platform detection for tiered card rendering
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isWebAuthenticated, setIsWebAuthenticated] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Detect platform (miniapp vs web)
  useEffect(() => {
    const checkPlatform = () => {
      const isMini =
        (typeof window !== 'undefined' && (window as any).__ORTHOIQ_MINI_APP__ === true) ||
        window.location.pathname.startsWith('/miniapp') ||
        new URL(window.location.href).searchParams.get('miniApp') === 'true';
      setIsMiniApp(isMini);
    };
    checkPlatform();
  }, []);

  // Check web authentication status
  useEffect(() => {
    const checkWebAuth = async () => {
      if (isMiniApp) {
        // In miniapp, we rely on fid prop for auth
        setIsWebAuthenticated(!!fid);
        console.log('[ResponseCard] Auth check (miniapp):', { isMiniApp, fid, isAuthenticated: !!fid });
        return;
      }

      // Check for web session - only need user data for UI, not session token
      try {
        const userStr = localStorage.getItem('orthoiq_web_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const isVerified = user?.emailVerified === true;
          setIsWebAuthenticated(isVerified);
          console.log('[ResponseCard] Auth check (web):', {
            user,
            emailVerified: user?.emailVerified,
            isWebAuthenticated: isVerified
          });
        } else {
          setIsWebAuthenticated(false);
          console.log('[ResponseCard] Auth check (web): No user found');
        }
      } catch (error) {
        setIsWebAuthenticated(false);
        console.error('[ResponseCard] Auth check error:', error);
      }
    };
    checkWebAuth();
  }, [isMiniApp, fid]);

  // Generate Intelligence Card data for web users
  const cardData = useMemo(() => {
    if (rawConsultationData && feedbackSubmitted) {
      console.log('[ResponseCard] Generating card data from:', rawConsultationData);
      const data = mapConsultationToCardData(rawConsultationData);
      console.log('[ResponseCard] Generated card data:', data);
      return data;
    }
    console.log('[ResponseCard] No card data - rawConsultationData:', !!rawConsultationData, 'feedbackSubmitted:', feedbackSubmitted);
    return null;
  }, [rawConsultationData, feedbackSubmitted]);

  // Simulate progressive loading for specialist consultation
  useEffect(() => {
    if (hasSpecialistConsultation && agentBadges.length > 0) {
      // Start with coordinating stage
      setConsultationStage('coordinating');
      
      // Move to analyzing after a delay
      const analyzeTimer = setTimeout(() => {
        setConsultationStage('analyzing');
        
        // Simulate specialists completing one by one
        let completed = 0;
        const interval = setInterval(() => {
          completed++;
          setCompletedSpecialists(completed);
          
          if (completed >= agentBadges.length) {
            clearInterval(interval);
            setConsultationStage('complete');
          }
        }, 800);
        
        return () => clearInterval(interval);
      }, 1500);
      
      return () => clearTimeout(analyzeTimer);
    } else {
      setConsultationStage('complete');
    }
  }, [hasSpecialistConsultation, agentBadges]);

  // Check payment status when prescription metadata is available
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (prescriptionMetadata?.id && fid) {
        try {
          const response = await fetch(`/api/prescription/payment-status?prescriptionId=${prescriptionMetadata.id}`);
          if (response.ok) {
            const data = await response.json();
            setPaymentStatus(data);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }
    };

    checkPaymentStatus();
  }, [prescriptionMetadata?.id, fid]);

  // Handle feedback submission from modal
  const handleFeedbackSubmitted = (rewards: Array<{agent: string; reward: number; accuracy: number}>) => {
    setFeedbackSubmitted(true);
    setTokenRewards(rewards);
    // Notify parent component if callback provided
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted(true);
    }
  };

  // Backend returns clean markdown - display directly
  let displayResponse = response;

  // Log for debugging purposes
  if (process.env.NODE_ENV === 'development') {
    console.log('ResponseCard received response type:', typeof response);
    console.log('ResponseCard response preview:', typeof response === 'string' ? response.substring(0, 200) : response);
  }

  // Ensure displayResponse is always a string
  if (typeof displayResponse !== 'string') {
    console.warn('ResponseCard: Response is not a string, converting:', displayResponse);
    displayResponse = String(displayResponse);
  }

  // Clean specialist content to remove duplicates
  const cleanSpecialistContent = (content: string): string => {
    if (!content) return '';

    let cleaned = content;

    // Remove first heading (markdown # or ## or ###)
    cleaned = cleaned.replace(/^#{1,3}\s+[^\n]+\n/, '');

    // Remove confidence text at the end (various patterns)
    // Matches: "**Confidence: 95%**" or "Confidence: 95%" at end of text
    cleaned = cleaned.replace(/\*\*Confidence:\s*\d+%\*\*\s*$/i, '');
    cleaned = cleaned.replace(/Confidence:\s*\d+%\s*$/i, '');

    return cleaned.trim();
  };

  // Toggle specialist expansion
  const toggleSpecialist = (index: number) => {
    setExpandedSpecialists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAllSpecialists = () => {
    const allIndices = enrichments?.map((_, i) => i) || [];
    setExpandedSpecialists(new Set(allIndices));
  };

  const collapseAllSpecialists = () => {
    setExpandedSpecialists(new Set());
  };

  const getCoordinationBadges = () => {
    if (!agentCoordination) return [];
    
    const badges = [];
    
    // Agent count badge
    if (agentCoordination.activeAgents !== undefined) {
      const agentClassName = agentCoordination.activeAgents > 0 
        ? 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800'
        : 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
      badges.push(
        <div key="agents" className={agentClassName}>
          <span className="mr-1">🤖</span>
          {agentCoordination.activeAgents} agent{agentCoordination.activeAgents !== 1 ? 's' : ''} coordinated
        </div>
      );
    }
    
    // Network status badge
    if (agentCoordination.networkStatus) {
      const statusConfig = {
        active: { 
          className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800',
          icon: '🌐', 
          text: 'Network Active' 
        },
        degraded: { 
          className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800',
          icon: '⚠️', 
          text: 'Network Degraded' 
        },
        error: { 
          className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800',
          icon: '❌', 
          text: 'Network Error' 
        }
      };
      const config = statusConfig[agentCoordination.networkStatus];
      badges.push(
        <div key="network" className={config.className}>
          <span className="mr-1">{config.icon}</span>
          {config.text}
        </div>
      );
    }
    
    // Performance badge
    if (agentCoordination.performance) {
      const successRate = Math.round(agentCoordination.performance.successRate * 100);
      const perfClassName = successRate >= 90 
        ? 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'
        : successRate >= 70 
        ? 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'
        : 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
      badges.push(
        <div key="performance" className={perfClassName}>
          <span className="mr-1">⚡</span>
          {successRate}% success rate
        </div>
      );
    }
    
    // Load indicator badge
    if (agentCoordination.currentLoad !== undefined && agentCoordination.maxLoad !== undefined) {
      const loadPercent = Math.round((agentCoordination.currentLoad / agentCoordination.maxLoad) * 100);
      const loadClassName = loadPercent <= 50 
        ? 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'
        : loadPercent <= 80 
        ? 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'
        : 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
      badges.push(
        <div key="load" className={loadClassName}>
          <span className="mr-1">📊</span>
          Load: {agentCoordination.currentLoad}/{agentCoordination.maxLoad}
        </div>
      );
    }
    
    // Coordination type badge
    if (agentCoordination.coordinationType) {
      const typeConfig = {
        distributed: { icon: '🔄', text: 'Distributed' },
        sequential: { icon: '➡️', text: 'Sequential' },
        parallel: { icon: '⚡', text: 'Parallel' }
      };
      const config = typeConfig[agentCoordination.coordinationType];
      badges.push(
        <div key="type" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          <span className="mr-1">{config.icon}</span>
          {config.text} Processing
        </div>
      );
    }
    
    return badges;
  };

  const getStatusBadge = () => {
    if (isFiltered) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <span className="mr-1">🔍</span>
          Content Filtered
        </div>
      );
    }
    
    if (isApproved && reviewedBy && reviewType) {
      // Enhanced review status badges
      if (reviewType === 'approve_as_is') {
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="mr-1">✅</span>
            Medically reviewed and approved
          </div>
        );
      }
      
      if (reviewType === 'approve_with_additions') {
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <span className="mr-1">✅➕</span>
            Doctor reviewed with additions
          </div>
        );
      }
      
      if (reviewType === 'approve_with_corrections') {
        return (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <span className="mr-1">✅✏️</span>
            Doctor reviewed with corrections
          </div>
        );
      }
    }
    
    // Legacy approval (fallback)
    if (isApproved && reviewedBy) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="mr-1">✅</span>
          Dr. {reviewedBy} approved
        </div>
      );
    }
    
    if (isPendingReview) {
      return (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <span className="mr-1">⏳</span>
          Pending medical review
        </div>
      );
    }
    
    return null;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };


  const handleExportPrescription = async (format: 'png' | 'svg' | 'instagram' | 'linkedin' | 'twitter') => {
    if (!prescriptionRef.current || !prescriptionMetadata || !question || !fid) return;

    // Extract curated prescription data from comprehensive mode consultation
    let enhancedData: any = undefined;
    if (rawConsultationData?.synthesizedRecommendations?.prescriptionData) {
      const prescData = rawConsultationData.synthesizedRecommendations.prescriptionData;
      const synthRec = rawConsultationData.synthesizedRecommendations;

      enhancedData = {
        primaryDiagnosis: prescData.diagnosisHypothesis?.primary,
        diagnosisConfidence: prescData.diagnosisHypothesis?.confidence,
        agentConsensus: prescData.diagnosisHypothesis?.agentConsensus,
        topSpecialistInsights: prescData.specialistInsights?.slice(0, 2) || [],
        topRecommendations: synthRec.treatmentPlan?.phase1?.interventions?.slice(0, 2) || [],
        evidenceGrade: prescData.evidenceBase?.evidenceGrade
      };
    }

    const prescriptionData: PrescriptionData = {
      userQuestion: question,
      claudeResponse: response,
      confidence: confidence || 0.8,
      fid: fid,
      caseId: caseId || 'demo-case',
      timestamp: new Date().toISOString(),
      inquiry: inquiry,
      keyPoints: keyPoints,
      enhancedData: enhancedData
    };

    try {
      await exportPrescription(prescriptionRef.current, prescriptionData, prescriptionMetadata, { format });
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-sm border"
      style={{ overflow: 'visible' }}
    >
      {/* Progressive Loading Container */}
      <AnimatePresence mode="wait">
        {consultationStage !== 'complete' && hasSpecialistConsultation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 border-b border-purple-200"
          >
            <ConsultationProgressBar
              stage={consultationStage}
              specialistCount={agentBadges.length}
              completedCount={completedSpecialists}
              estimatedTime={agentBadges.length * 2}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🔬</span>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-medical-primary to-medical-accent bg-clip-text text-transparent">
              OrthoIQ Response
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            
            {confidence !== undefined && (
              <button
                onClick={() => setShowConfidence(!showConfidence)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                ⓘ Confidence
              </button>
            )}
          </div>
        </div>
        
        {/* Agent Coordination Indicators */}
        {agentCoordination && getCoordinationBadges().length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {getCoordinationBadges()}
          </div>
        )}
        
        {/* Premium Specialist Consultation Section */}
        {hasSpecialistConsultation && agentBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-xl"
                >
                  🏥
                </motion.span>
                <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Multi-Specialist Consultation
                </span>
                <span className="px-2 py-0.5 bg-premium-100 text-premium-700 text-xs font-medium rounded-full">
                  Premium
                </span>
              </div>
            </div>
            
            {/* Specialist Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {agentBadges.map((badge, index) => {
                  const shouldShow = consultationStage === 'complete' ||
                                    (consultationStage === 'analyzing' && index < completedSpecialists);

                  // Find the enrichment for this specialist to get real confidence
                  const specialistEnrichment = enrichments?.find(
                    e => e.metadata?.specialist === badge.type || e.metadata?.agentType === badge.type
                  );
                  const realConfidence = specialistEnrichment?.metadata?.confidence || 0.85;

                  // Debug logging to track confidence values
                  if (process.env.NODE_ENV === 'development' && specialistEnrichment) {
                    console.log(`[ResponseCard] Specialist ${badge.type}:`, {
                      found: !!specialistEnrichment,
                      confidence: specialistEnrichment?.metadata?.confidence,
                      specialist: specialistEnrichment?.metadata?.specialist,
                      agentType: specialistEnrichment?.metadata?.agentType
                    });
                  }

                  return shouldShow ? (
                    <SpecialistBadge
                      key={badge.type}
                      name={badge.name}
                      type={badge.type}
                      specialty={badge.specialty}
                      status={index < completedSpecialists ? 'completed' :
                              consultationStage === 'analyzing' ? 'active' : 'pending'}
                      confidence={realConfidence}
                      animationDelay={index * 0.1}
                    />
                  ) : null;
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </motion.div>
      
      {/* Confidence Display */}
      {showConfidence && confidence !== undefined && (
        <div className="px-4 py-2 bg-blue-50 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">AI Confidence Level:</span>
            <span className={`font-medium ${getConfidenceColor(confidence)}`}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>
      )}
      
      {/* Response Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-6"
        style={{ overflow: 'visible', height: 'auto' }}>
        <div
          className="prose prose-lg max-w-none text-left prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-ul:mb-4 prose-li:text-gray-700 prose-strong:text-gray-900 prose-strong:font-semibold [&>*]:!line-clamp-none [&>*]:!-webkit-line-clamp-none"
          style={{ maxHeight: 'none', overflow: 'visible', WebkitLineClamp: 'unset', display: 'block' }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {hasCorrections && correctionsText ? correctionsText : displayResponse}
          </ReactMarkdown>
        </div>
        
        {/* Doctor's Additions */}
        {hasAdditions && additionsText && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="text-blue-600 text-sm font-medium">👨‍⚕️ Doctor&apos;s Additional Information:</span>
            </div>
            <div className="prose max-w-none text-left prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {additionsText}
              </ReactMarkdown>
            </div>
          </div>
        )}
        
      </motion.div>

      {/* Feedback System with Modal - Only for fast mode (comprehensive uses prescription lock below) */}
      {!isFiltered && consultationStage === 'complete' && !hasSpecialistConsultation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="px-6 pb-4"
        >
          {!feedbackSubmitted ? (
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="w-full bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl p-5 hover:border-indigo-400 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h4 className="text-lg font-bold text-indigo-900 mb-1 group-hover:text-indigo-700 transition-colors">
                    Share Your Feedback
                  </h4>
                  <p className="text-sm text-indigo-700">
                    Help improve our AI specialists • Takes 2 minutes
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">💬</span>
                  <svg className="w-6 h-6 text-indigo-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 text-center"
            >
              <div className="text-4xl mb-2">🧠</div>
              <h4 className="text-lg font-bold text-green-900 mb-2">Thank you for your feedback!</h4>
              <p className="text-sm text-green-700 mb-4">
                Your input helps train our AI specialists. View your Intelligence Card below.
              </p>
              <button
                onClick={() => setShowIntelligenceCardModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <span className="mr-2">📊</span>
                View Intelligence Card
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Token Rewards Display */}
      {feedbackSubmitted && tokenRewards.length > 0 && (
        <div className="px-6 pb-4">
          <TokenRewards
            consultationId={specialistConsultation?.consultationId}
            tokenRewards={tokenRewards}
            showAnimation={true}
          />
        </div>
      )}

      {/* Feedback Modal */}
      {specialistConsultation?.consultationId && fid && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          consultationId={specialistConsultation.consultationId}
          patientId={fid}
          mode={hasSpecialistConsultation ? 'normal' : 'fast'}
          hasSpecialistConsultation={hasSpecialistConsultation}
          specialists={agentBadges}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      )}

      {/* Intelligence Card Modal */}
      {fid && (
        <IntelligenceCardModal
          isOpen={showIntelligenceCardModal}
          onClose={() => setShowIntelligenceCardModal(false)}
          rawConsultationData={rawConsultationData}
          fid={fid}
          isMiniApp={isMiniApp}
        />
      )}

      {/* Coordination Metadata - Shows after consultation completes */}
      {hasSpecialistConsultation && specialistConsultation && consultationStage === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-4 pb-4"
        >
          <CoordinationMetadata
            consultationId={specialistConsultation.consultationId}
            specialistCount={specialistConsultation.specialistCount}
            totalTime={24}
            confidence={confidence}
          />
        </motion.div>
      )}

      {/* Intelligence Card Gating - Tiered based on platform and auth */}
      {/* Wrapped in ClientOnly to prevent SSR hydration mismatch */}
      <ClientOnly>
        {!isFiltered && hasSpecialistConsultation && consultationStage === 'complete' && (
          <div className="px-6 pb-4">
          {/* TIER 1: Unauthenticated/Guest Web Users - Feedback gate then signup CTA */}
          {!isMiniApp && !isWebAuthenticated && !feedbackSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6 text-center"
            >
              <div className="text-5xl mb-3">💬</div>
              <h3 className="text-xl font-bold text-purple-900 mb-2">
                Help Improve Our AI
              </h3>
              <p className="text-purple-700 mb-4">
                Your feedback helps train our AI specialists to provide better recommendations
              </p>
              <div className="bg-white/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-800 font-medium">
                  ✨ Takes less than a minute and helps everyone!
                </p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105"
              >
                Submit Feedback
              </button>
            </motion.div>
          )}

          {/* TIER 1: Unauthenticated/Guest Web Users - After feedback, show signup CTA */}
          {!isMiniApp && !isWebAuthenticated && feedbackSubmitted && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4 text-center"
              >
                <span className="text-2xl">🙏</span>
                <p className="text-green-800 font-medium mt-1">Thank you for your feedback!</p>
              </motion.div>
              <IntelligenceCardCTA onVerifyEmail={() => setShowEmailModal(true)} />
            </>
          )}

          {/* TIER 2: Authenticated Web Users - Feedback gate then WebIntelligenceCard */}
          {!isMiniApp && isWebAuthenticated && !feedbackSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6 text-center"
            >
              <div className="text-5xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-purple-900 mb-2">
                Unlock Your Intelligence Card
              </h3>
              <p className="text-purple-700 mb-4">
                Submit feedback to help our AI specialists learn and unlock your personalized Intelligence Card
              </p>
              <div className="bg-white/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-800 font-medium">
                  ✨ Your feedback directly improves our AI agents&apos; prediction accuracy
                </p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105"
              >
                Submit Feedback to Unlock
              </button>
            </motion.div>
          )}

          {/* TIER 2: Authenticated Web Users - Show WebIntelligenceCard after feedback */}
          {!isMiniApp && isWebAuthenticated && feedbackSubmitted && cardData && (
            <WebIntelligenceCard data={cardData} caseId={caseId || cardData.caseId} />
          )}

          {/* TIER 3: Miniapp Users - Full feedback gate */}
          {isMiniApp && !feedbackSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6 text-center"
            >
              <div className="text-5xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-purple-900 mb-2">
                Unlock Your Intelligence Card
              </h3>
              <p className="text-purple-700 mb-4">
                Submit feedback to help our AI specialists learn and unlock your personalized Intelligence Card
              </p>
              <div className="bg-white/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-800 font-medium">
                  ✨ Your feedback directly improves our AI agents&apos; prediction accuracy
                </p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105"
              >
                Submit Feedback to Unlock
              </button>
            </motion.div>
          )}

          {/* TIER 3: Miniapp Users - Full IntelligenceCard after feedback */}
          {isMiniApp && feedbackSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 text-center"
            >
              <div className="text-4xl mb-2">🧠</div>
              <h4 className="text-lg font-bold text-green-900 mb-1">Intelligence Card Unlocked!</h4>
              <p className="text-sm text-green-700 mb-4">
                Thank you for your feedback. View your AI consultation with agent predictions and consensus data.
              </p>
              <button
                onClick={() => setShowIntelligenceCardModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <span className="mr-2">📊</span>
                View Intelligence Card
              </button>
            </motion.div>
          )}
          </div>
        )}
      </ClientOnly>

      {/* MD Review Upgrade Section */}
      {!isFiltered && prescriptionMetadata && questionId && fid && feedbackSubmitted && (
        <div className="px-4 pb-4">
          <MDReviewUpgrade
            prescriptionId={prescriptionMetadata.id}
            questionId={parseInt(questionId)}
            fid={fid}
            isAlreadyPaid={paymentStatus?.hasPaymentRequest || false}
            paymentStatus={paymentStatus?.paymentStatus}
            inReviewQueue={paymentStatus?.inReviewQueue || false}
            isReviewed={isApproved && reviewedBy !== undefined}
          />
        </div>
      )}
      
      
      {/* Specialist Consultation Details */}
      {enrichments && enrichments.length > 0 && hasSpecialistConsultation && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="border-t bg-gradient-to-b from-gray-50 to-white"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🩺</span>
                <h4 className="font-semibold bg-gradient-to-r from-medical-primary to-medical-accent bg-clip-text text-transparent">
                  Specialist Assessments
                </h4>
                <span className="px-2 py-1 bg-gradient-to-r from-premium-100 to-premium-200 text-premium-700 text-xs font-medium rounded-full">
                  {enrichments.length} specialist{enrichments.length !== 1 ? 's' : ''} consulted
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={expandedSpecialists.size === enrichments.length ? collapseAllSpecialists : expandAllSpecialists}
                  className="text-xs text-medical-primary hover:text-medical-accent font-medium transition-colors"
                >
                  {expandedSpecialists.size === enrichments.length ? '− Collapse All' : '+ Expand All'}
                </button>
                <div className="text-xs text-gray-600 text-right">
                  <p>Powered by OrthoIQ-Agents AI Network</p>
                  <p className="mt-1">Click to view detailed assessments</p>
                </div>
              </div>
            </div>
            
            {/* Specialist Responses */}
            <div className="space-y-3">
              {enrichments.map((enrichment, index) => {
                const isExpanded = expandedSpecialists.has(index);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Clickable Header */}
                    <button
                      onClick={() => toggleSpecialist(index)}
                      className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-premium-400 to-premium-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {enrichment.metadata?.specialist?.charAt(0).toUpperCase() || 'S'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900">
                          {enrichment.title}
                        </h5>
                        {enrichment.metadata?.confidence && (
                          <div className="mt-1 flex items-center space-x-2">
                            <div className="flex-1 max-w-[100px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-medical-primary to-medical-accent rounded-full"
                                style={{ width: `${enrichment.metadata.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {Math.round(enrichment.metadata.confidence * 100)}% confidence
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expandable Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-gray-100">
                            <div className="prose max-w-none text-left prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-headings:font-semibold prose-headings:text-gray-900 prose-ul:mb-4 prose-li:text-gray-700 pt-4">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {cleanSpecialistContent(typeof enrichment.content === 'string' ? enrichment.content : String(enrichment.content))}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Fallback for unavailable specialists - only show for comprehensive mode, not fast mode (triage only) */}
      {hasSpecialistConsultation && (!enrichments || enrichments.length === 0) && consultationStage === 'complete' && specialistConsultation?.participatingSpecialists && specialistConsultation.participatingSpecialists.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
        >
          <div className="flex items-start space-x-2">
            <span className="text-amber-600">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-900">
                Specialist consultation temporarily unavailable
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Showing standard response. Specialist review will be available shortly.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bottom Feedback System - For users who scroll through all specialist details */}
      {/* Only show for miniapp users (web users see the tiered system above) */}
      <ClientOnly>
        {!isFiltered && hasSpecialistConsultation && enrichments && enrichments.length > 0 && consultationStage === 'complete' && isMiniApp && (
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="px-6 pb-4"
        >
          {!feedbackSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6 text-center"
            >
              <div className="text-5xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-purple-900 mb-2">
                Unlock Your Intelligence Card
              </h3>
              <p className="text-purple-700 mb-4">
                Submit feedback to help our AI specialists learn and unlock your Intelligence Card
              </p>
              <div className="bg-white/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-800 font-medium">
                  ✨ Your feedback directly improves our AI agents&apos; prediction accuracy
                </p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105"
              >
                Submit Feedback to Unlock
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 text-center"
            >
              <div className="text-4xl mb-2">🧠</div>
              <h4 className="text-lg font-bold text-green-900 mb-1">Intelligence Card Unlocked!</h4>
              <p className="text-sm text-green-700 mb-4">
                Thank you for your feedback. View your AI consultation with agent predictions.
              </p>
              <button
                onClick={() => setShowIntelligenceCardModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <span className="mr-2">📊</span>
                View Intelligence Card
              </button>
            </motion.div>
          )}
          </motion.div>
        )}
      </ClientOnly>

      {/* Medical Disclaimer */}
      {!isFiltered && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="px-4 py-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-t"
        >
          <p className="text-xs text-yellow-800">
            <span className="font-medium">⚠️ Medical Disclaimer:</span> This AI provides educational information only. 
            Always consult with a qualified healthcare provider for medical concerns.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}