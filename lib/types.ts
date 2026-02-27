export interface Question {
  id: string;
  fid: string;
  question: string;
  response: string;
  timestamp: Date;
  isFiltered: boolean;
}

export interface RateLimit {
  fid: string;
  count: number;
  lastReset: Date;
}

export interface FrameMessage {
  fid: string;
  text?: string;
  button?: number;
  timestamp: Date;
}

export interface ClaudeResponse {
  response: string;
  isRelevant: boolean;
  confidence: number;
  inquiry?: string;
  keyPoints?: string[];
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
  rawConsultationData?: any; // Preserve raw consultation data for specialist extraction
  researchData?: any; // Inline research data returned by agents system alongside consultation
  // Phase 3.1: Two-stage consultation UX
  urgencyLevel?: 'emergency' | 'urgent' | 'semi-urgent' | 'routine';
  // Scope validation for out-of-scope queries
  isOutOfScope?: boolean;
  scopeValidation?: {
    category: string;
    message: {
      title: string;
      message: string;
      suggestion: string;
    };
    detectedCondition: string;
    confidence: number;
  };
}


export interface PrescriptionData {
  userQuestion: string;
  claudeResponse: string;
  confidence: number;
  fid: string;
  caseId: string;
  timestamp: string;
  userEmail?: string;
  inquiry?: string;
  keyPoints?: string[];
  enhancedData?: {
    primaryDiagnosis?: string;
    diagnosisConfidence?: number;
    agentConsensus?: number;
    topSpecialistInsights?: Array<{
      specialist: string;
      keyInsight: string;
      confidence: number;
    }>;
    topRecommendations?: Array<{
      intervention: string;
      frequency?: string;
      provider?: string;
    }>;
    evidenceGrade?: string;
  };
}

export interface PrescriptionMetadata {
  id: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'ultra-rare';
  theme: PrescriptionTheme;
  generatedAt: string;
  verificationHash: string;
  patientId: string;
  prescriberId: string;
  watermarkType?: 'none' | 'medical_pattern' | 'gold_caduceus' | 'holographic';
  nftMetadata?: object;
}

export interface PrescriptionTheme {
  primaryColor: string;
  accentColor: string;
  borderStyle: string;
  effects: string[];
  logoVariant: 'blue' | 'teal' | 'monochrome' | 'gold';
}

export interface ParsedResponse {
  chiefComplaint: string;
  assessment: string[];
  recommendations: string[];
  disclaimers: string[];
  inquiry?: string;
  keyPoints?: string[];
}

export interface RarityConfig {
  name: 'common' | 'uncommon' | 'rare' | 'ultra-rare';
  probability: number;
  theme: PrescriptionTheme;
  minConfidence?: number;
}

// Payment system interfaces for MD review
export interface PaymentRequest {
  id: number;
  paymentId: string;
  prescriptionId: string;
  questionId: number;
  fid: string;
  amountUSDC: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentHash?: string;
  walletAddress?: string;
  requestedAt: Date;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MDReviewQueue {
  id: number;
  prescriptionId: string;
  paymentId: string;
  fid: string;
  priority: number;
  status: 'pending' | 'in_review' | 'completed' | 'expired';
  assignedToMD?: string;
  reviewNotes?: string;
  mdSignature?: string;
  reviewedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletConnectionState {
  isConnected: boolean;
  address?: string;
  balance?: number;
  isConnecting: boolean;
  error?: string;
}

export interface PaymentModalProps {
  prescriptionId: string;
  questionId: number;
  fid: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: string) => void;
}

export interface MDReviewUpgradeProps {
  prescriptionId: string;
  questionId: number;
  fid: string;
  isAlreadyPaid: boolean;
  paymentStatus?: string;
  inReviewQueue: boolean;
  isReviewed: boolean;
}

export interface PaymentStatusProps {
  paymentId: string;
  onStatusUpdate: (status: string) => void;
}

// Agent System Types
export interface AgentContext {
  question: string;
  fid: string;
  questionId?: number;
  userTier: 'basic' | 'authenticated' | 'medical' | 'scholar' | 'practitioner' | 'institution';
  metadata?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  enrichments?: AgentEnrichment[];
  cost?: number; // In Claude API tokens or USDC
}

export interface AgentEnrichment {
  type: 'research' | 'citation' | 'image_analysis' | 'followup';
  title: string;
  content: string;
  metadata?: Record<string, any>;
  nftEligible?: boolean;
  rarityTier?: ResearchRarity;
}

export interface Agent {
  name: string;
  description: string;
  canHandle(context: AgentContext): boolean;
  execute(context: AgentContext): Promise<AgentResult>;
  estimateCost(context: AgentContext): number;
}

export interface AgentTask {
  id: string;
  agentName: string;
  context: AgentContext;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: AgentResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
}

// Research System Types
export type ResearchRarity = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ResearchQuery {
  condition: string;
  bodyParts: string[];
  treatmentType?: string;
  studyTypes?: ('rct' | 'cohort' | 'case-control' | 'systematic-review' | 'meta-analysis')[];
  maxAge?: number; // Papers published within X years
  minSampleSize?: number;
}

export interface ResearchPaper {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  abstract: string;
  citationCount?: number;
  impactFactor?: number;
  evidenceLevel: 'I' | 'II' | 'III' | 'IV' | 'V';
  fullTextAvailable: boolean;
}

export interface ResearchSynthesis {
  id: string;
  query: ResearchQuery;
  papers: ResearchPaper[];
  synthesis: string;
  keyFindings: string[];
  limitations: string[];
  clinicalRelevance: string;
  evidenceStrength: 'strong' | 'moderate' | 'weak' | 'insufficient';
  generatedAt: Date;
  mdReviewed: boolean;
  mdReviewer?: string;
  mdNotes?: string;
}

export interface ResearchNFTMetadata {
  id: string;
  rarity: ResearchRarity;
  studyCount: number;
  publicationYears: string;
  evidenceLevel: string;
  specialties: string[];
  citationCount: number;
  impactFactor: number;
  clinicalRelevance: number;
  timesViewed: number;
  timesCited: number;
  mdEndorsements: string[];
  researchHash: string;
  createdAt: Date;
  lastUpdated: Date;
}

export interface ResearchSubscription {
  fid: string;
  tier: 'scholar' | 'practitioner' | 'institution';
  bronzeQuota: number;
  silverQuota: number;
  goldQuota: number;
  bronzeUsed: number;
  silverUsed: number;
  goldUsed: number;
  resetDate: Date;
  isActive: boolean;
}

// OrthoIQ-Agents Integration Types
export type ConsultationMode = 'fast' | 'normal';

export interface ConsultationRequest {
  caseData: CaseData;
  requiredSpecialists?: SpecialistType[];
  mode?: ConsultationMode;
}

export type SpecialistType = 'triage' | 'painWhisperer' | 'movementDetective' | 'strengthSage' | 'mindMender';

export interface CaseData {
  // Dual-track data
  rawQuery?: string;
  enableDualTrack?: boolean;
  userId?: string;
  isReturningUser?: boolean;
  priorConsultations?: string[];
  requestResearch?: boolean;
  uploadedImages?: string[];

  // Athlete profile
  athleteProfile?: {
    sport?: string;
    experience?: string;
    weeklyMileage?: number;
  };

  // Platform metadata
  platformContext?: {
    source?: string;
    version?: string;
  };

  // Traditional case data
  primaryComplaint: string;
  symptoms?: string;
  painLevel?: number;
  duration?: string;
  location?: string;
  age?: number;

  // Specialist-specific data
  painData?: {
    location?: string;
    quality?: string;
    triggers?: string[];
    relievers?: string[];
  };
  movementData?: {
    restrictions?: string[];
    patterns?: string[];
  };
  functionalData?: {
    limitations?: string[];
    goals?: string[];
  };
  psychData?: {
    fearAvoidance?: boolean;
    copingStrategies?: string[];
  };

  // Quick flags
  functionalLimitations?: boolean;
  movementDysfunction?: boolean;
  anxietyLevel?: number;
  psychologicalFactors?: boolean;
}

export interface SpecialistAssessment {
  primaryFindings: string[];
  confidence: number;
  dataQuality: number;
  clinicalImportance: 'low' | 'medium' | 'high' | 'critical';
}

export interface StructuredRecommendation {
  intervention: string;
  priority: number;
  evidenceGrade: 'A' | 'B' | 'C';
  contraindications: string[];
  timeline: string;
  expectedOutcome: string;
}

export interface KeyFinding {
  finding: string;
  confidence: number;
  clinicalRelevance: 'low' | 'medium' | 'high';
  requiresMDReview: boolean;
}

export interface InterAgentQuestion {
  targetAgent: string;
  question: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SpecialistResponse {
  specialist: string;
  specialistType: SpecialistType;
  assessment: SpecialistAssessment;
  response: string;
  recommendations: StructuredRecommendation[];
  keyFindings: KeyFinding[];
  questionsForAgents: InterAgentQuestion[];
  followUpQuestions: string[];
  agreementWithTriage: 'full' | 'partial' | 'disagree' | 'self';
  confidence: number;
  responseTime: number;
  timestamp: string;
  status: 'success' | 'failed';
}

export interface TreatmentPhase {
  name: string;
  timeframe: string;
  goals: string[];
  interventions: Array<{
    intervention: string;
    frequency: string;
    provider: string;
  }>;
  progressMarkers: string[];
}

export interface ClinicalFlag {
  flag: string;
  severity: 'routine' | 'semi-urgent' | 'urgent' | 'emergency';
  detectedBy: string;
  recommendedAction: string;
}

export interface ConfidenceFactors {
  dataCompleteness: number;
  interAgentAgreement: number;
  evidenceQuality: number;
  overallConfidence: number;
}

export interface DiagnosisHypothesis {
  primary: string;
  differential: string[];
  confidence: number;
  agentConsensus: number;
}

export interface SpecialistInsight {
  specialist: string;
  keyInsight: string;
  confidence: number;
}

export interface EvidenceBase {
  recommendationStrength: string;
  evidenceGrade: string;
  references: string[];
}

export interface TrackingMetric {
  metric: string;
  baseline: string;
  target: string;
  timeframe: string;
}

export interface PrescriptionDataEnhanced {
  diagnosisHypothesis: DiagnosisHypothesis;
  specialistInsights: SpecialistInsight[];
  evidenceBase: EvidenceBase;
  trackingMetrics: TrackingMetric[];
}

export interface SuggestedFollowUp {
  question: string;
  purpose: string;
  expectedImpact: 'low' | 'medium' | 'high';
  targetedSpecialist: string;
}

export interface FeedbackPrompts {
  immediate: {
    question: string;
    type: string;
  };
  milestones: Array<{
    day: number;
    prompt: string;
    metrics: string[];
  }>;
}

export interface SynthesizedRecommendations {
  synthesis: string;
  treatmentPlan: {
    phase1: TreatmentPhase;
    phase2: TreatmentPhase;
    phase3: TreatmentPhase;
  };
  clinicalFlags: {
    redFlags: ClinicalFlag[];
    requiresImmediateMD: boolean;
    urgencyLevel: string;
    safeToProceed: boolean;
  };
  confidenceFactors: ConfidenceFactors;
  prescriptionData: PrescriptionDataEnhanced;
  suggestedFollowUp: SuggestedFollowUp[];
  feedbackPrompts: FeedbackPrompts;
}

export interface InterAgentDialogue {
  fromAgent: string;
  toAgent: string;
  question: string;
  response: string;
  impactOnDiagnosis: boolean;
}

export interface Disagreement {
  topic: string;
  agents: string[];
  positions: string[];
  resolution: string;
  severity: 'low' | 'medium' | 'high';
}

export interface EmergentFinding {
  finding: string;
  discoveredBy: string[];
  novelty: 'expected' | 'interesting' | 'unusual';
}

export interface CoordinationMetadata {
  interAgentDialogue: InterAgentDialogue[];
  disagreements: Disagreement[];
  emergentFindings: EmergentFinding[];
}

export interface NormalModeConsultation {
  responses: Array<{ response: SpecialistResponse }>;
  synthesizedRecommendations: SynthesizedRecommendations;
  coordinationMetadata: CoordinationMetadata;
  participatingSpecialists: string[];
  consultationId: string;
  totalResponseTime: number;
  timestamp: string;
}

export interface FastModeTriageResponse {
  specialist: string;
  specialistType: 'triage';
  assessment: SpecialistAssessment;
  response: string;
  recommendations: StructuredRecommendation[];
  keyFindings: KeyFinding[];
  questionsForAgents: InterAgentQuestion[];
  followUpQuestions: string[];
  urgencyLevel: 'emergency' | 'urgent' | 'semi-urgent' | 'routine';
  specialistRecommendations: string[];
  caseId: string;
  confidence: number;
  responseTime: number;
  timestamp: string;
  status: 'success';
}

export interface ConsultationResponseNormal {
  success: boolean;
  mode: 'normal';
  consultation: NormalModeConsultation;
  dataCompleteness: number;
  suggestedFollowUp: string[];
  triageConfidence: number;
  specialistCoverage: {
    triage: boolean;
    painWhisperer: boolean;
    movementDetective: boolean;
    strengthSage: boolean;
    mindMender: boolean;
  };
  fromCache: boolean;
  responseTime: number;
  timestamp: string;
}

export interface ConsultationResponseFast {
  success: boolean;
  mode: 'fast';
  triage: FastModeTriageResponse;
  status: 'processing';
  message: string;
  consultationId: string;
  responseTime: number;
  timestamp: string;
}

export type ConsultationResponse = ConsultationResponseNormal | ConsultationResponseFast;

// Research Agent Integration Types (Phase 2)
export interface ResearchCitation {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  quality: 'high' | 'moderate' | 'low';
  relevanceScore: number;
  abstract?: string;
  pubmedUrl: string;
}

export interface ResearchResult {
  consultationId: string;
  status: ResearchStatus;
  intro?: string;
  citations: ResearchCitation[];
  totalStudiesFound: number;
  searchTerms: string[];
  completedAt?: string;
  error?: string;
}

export type ResearchStatus = 'idle' | 'pending' | 'complete' | 'failed' | 'not_found';

export interface ResearchState {
  status: ResearchStatus;
  result: ResearchResult | null;
  error: string | null;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface AgentSummaryData {
  specialist: string;
  specialistType: string;
  icon: string;
  summary: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  agreementWithTriage: string;
}

export interface StructuredBriefData {
  keyFinding: string;
  immediateAction: string;
  consensusCount: number;
  totalAgents: number;
  overallConfidence: number;
  overallConfidenceLevel: ConfidenceLevel;
  agentSummaries: AgentSummaryData[];
  followUpQuestion: string | null;
  perAgentConfidences: Array<{ specialist: string; confidence: number }>;
}

// Feedback System Types
export interface FeedbackRequest {
  consultationId: string;
  patientId: string;
  feedback: {
    userSatisfaction: number;
    outcomeSuccess: boolean;
    mdReview?: {
      approved: boolean;
      reviewerName: string;
      reviewDate: string;
      specialistAccuracy: {
        pain: number;
        movement: number;
        strength: number;
        mind: number;
      };
    };
    followUpDataProvided?: {
      painReduction: number;
      functionalImprovement: number;
      adherenceRate: number;
      timeToRecovery: number;
    };
  };
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

// ── PROMIS types moved to lib/promisTypes.ts ──