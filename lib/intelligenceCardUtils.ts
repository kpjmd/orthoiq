// Intelligence Card Data Utilities
// Maps rawConsultationData from OrthoIQ-Agents backend to Intelligence Card format

export type SpecialistType = 'triage' | 'painWhisperer' | 'movementDetective' | 'strengthSage' | 'mindMender';
export type CardTier = 'standard' | 'complete' | 'verified' | 'exceptional';

export interface AgentStakeData {
  specialist: SpecialistType;
  agentName: string;
  tokenStake: number;
  participated: boolean;
  color: string;
  confidence: number;
}

export interface PrimaryPrediction {
  text: string;
  agent: string;
  stake: number;
  timeline?: string;
  validated?: boolean;
  actualOutcome?: string;
}

export interface IntelligenceCardData {
  caseId: string;
  timestamp: string;

  // Agent participation
  agentStakes: AgentStakeData[];
  totalStake: number;
  participatingCount: number;

  // Consensus metrics
  consensusPercentage: number;
  confidenceScore: number;

  // Primary prediction
  primaryPrediction: PrimaryPrediction;

  // Verification status
  userFeedbackComplete: boolean;
  mdReviewComplete: boolean;
  outcomeValidated: boolean;

  // Provenance
  evidenceGrade?: string;
  mdVerified: boolean;

  // Rarity tier
  tier: CardTier;
}

// Agent display names mapping
const AGENT_DISPLAY_NAMES: Record<SpecialistType, string> = {
  triage: 'Triage',
  painWhisperer: 'Pain',
  movementDetective: 'Movement',
  strengthSage: 'Strength',
  mindMender: 'Mental'
};

// Agent full names for predictions
const AGENT_FULL_NAMES: Record<SpecialistType, string> = {
  triage: 'OrthoTriage Master',
  painWhisperer: 'Pain Whisperer',
  movementDetective: 'Movement Detective',
  strengthSage: 'Strength Sage',
  mindMender: 'Mind Mender'
};

// Agent colors for theming
const AGENT_COLORS: Record<SpecialistType, string> = {
  triage: '#3b82f6',        // Blue
  painWhisperer: '#8b5cf6', // Purple
  movementDetective: '#10b981', // Green
  strengthSage: '#f59e0b',  // Amber
  mindMender: '#ef4444'     // Red
};

/**
 * Calculate token stake from confidence using exponential formula
 * Formula: base × confidence³ (rewards high confidence exponentially)
 */
export function calculateStakeFromConfidence(confidence: number): number {
  const baseStake = 10;
  const stake = baseStake * Math.pow(confidence, 3);
  return Math.round(stake * 10) / 10; // Round to 1 decimal
}

/**
 * Get agent color by specialist type
 */
export function getAgentColor(specialistType: SpecialistType): string {
  return AGENT_COLORS[specialistType] || '#64748b';
}

/**
 * Get agent display name (short form for card)
 */
export function getAgentDisplayName(specialistType: SpecialistType): string {
  return AGENT_DISPLAY_NAMES[specialistType] || specialistType;
}

/**
 * Get agent full name
 */
export function getAgentFullName(specialistType: SpecialistType): string {
  return AGENT_FULL_NAMES[specialistType] || specialistType;
}

/**
 * Normalize specialist type from various input formats
 */
function normalizeSpecialistType(input: string): SpecialistType {
  const normalized = input.toLowerCase().replace(/[^a-z]/g, '');

  if (normalized.includes('triage') || normalized.includes('orthotriage')) return 'triage';
  if (normalized.includes('pain') || normalized.includes('whisperer')) return 'painWhisperer';
  if (normalized.includes('movement') || normalized.includes('detective')) return 'movementDetective';
  if (normalized.includes('strength') || normalized.includes('sage')) return 'strengthSage';
  if (normalized.includes('mind') || normalized.includes('mender') || normalized.includes('mental')) return 'mindMender';

  return 'triage'; // Default fallback
}

/**
 * Extract primary prediction from specialist response
 * Looks for pain reduction, timeline, and outcome predictions
 */
export function extractPrimaryPrediction(
  responses: any[],
  highestStakeAgent: AgentStakeData | null
): PrimaryPrediction {
  if (!responses || responses.length === 0 || !highestStakeAgent) {
    return {
      text: 'Consultation analysis complete',
      agent: 'Triage',
      stake: 0
    };
  }

  // Find the response from the highest stake agent
  const agentResponse = responses.find((r: any) => {
    const nestedType = r.response?.specialistType || r.specialistType || r.specialist || '';
    const respType = normalizeSpecialistType(nestedType);
    return respType === highestStakeAgent.specialist;
  });

  // Extract response text - handle nested structure where response might be an object
  let responseText = '';
  if (agentResponse) {
    const nested = agentResponse.response;
    if (typeof nested === 'string') {
      responseText = nested;
    } else if (nested && typeof nested === 'object') {
      // Nested response object - extract the actual text
      responseText = nested.response || nested.synthesis || nested.rawSynthesis || '';
      if (typeof responseText !== 'string') {
        responseText = '';
      }
    }
    // Fallback to assessment if no response text
    if (!responseText && agentResponse.assessment) {
      responseText = typeof agentResponse.assessment === 'string'
        ? agentResponse.assessment
        : '';
    }
  }

  // Look for pain predictions (most common)
  const painMatch = responseText.match(/(\d{1,2})-(\d{1,2})%\s*(?:pain\s*)?reduction/i);
  const timeMatch = responseText.match(/(?:in|within)\s*(\d{1,2})\s*weeks?/i);

  if (painMatch) {
    const timeline = timeMatch ? `${timeMatch[1]} weeks` : undefined;
    return {
      text: `${painMatch[1]}-${painMatch[2]}% pain reduction${timeline ? ` in ${timeline}` : ''}`,
      agent: getAgentFullName(highestStakeAgent.specialist),
      stake: highestStakeAgent.tokenStake,
      timeline
    };
  }

  // Look for functional restoration predictions
  const functionalMatch = responseText.match(/(?:return to|resume)\s*(?:full\s*)?(?:activity|function|activities)/i);
  const funcTimeMatch = responseText.match(/(?:in|within)\s*(\d{1,2})\s*weeks?/i);

  if (functionalMatch && funcTimeMatch) {
    return {
      text: `Full return to activity in ${funcTimeMatch[1]} weeks`,
      agent: getAgentFullName(highestStakeAgent.specialist),
      stake: highestStakeAgent.tokenStake,
      timeline: `${funcTimeMatch[1]} weeks`
    };
  }

  // Fallback: Use first meaningful sentence from response
  const sentences = responseText.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
  const firstSentence = sentences[0]?.trim() || 'Specialist analysis complete';

  return {
    text: firstSentence.length > 80 ? firstSentence.substring(0, 77) + '...' : firstSentence,
    agent: getAgentFullName(highestStakeAgent.specialist),
    stake: highestStakeAgent.tokenStake
  };
}

/**
 * Calculate rarity tier based on consultation quality metrics
 */
export function calculateRarityTier(params: {
  participatingCount: number;
  consensusPercentage: number;
  mdVerified: boolean;
  outcomeValidated: boolean;
}): CardTier {
  const { participatingCount, consensusPercentage, mdVerified, outcomeValidated } = params;

  // Exceptional: All 5 agents + 90%+ consensus + MD verified + outcome validated
  if (participatingCount >= 5 && consensusPercentage >= 90 && mdVerified && outcomeValidated) {
    return 'exceptional';
  }

  // Verified: All 5 agents + 90%+ consensus + MD verified
  if (participatingCount >= 5 && consensusPercentage >= 90 && mdVerified) {
    return 'verified';
  }

  // Complete: 4-5 agents + 80%+ consensus
  if (participatingCount >= 4 && consensusPercentage >= 80) {
    return 'complete';
  }

  // Standard: Everything else
  return 'standard';
}

/**
 * Get tier display configuration
 */
export function getTierConfig(tier: CardTier): {
  label: string;
  percentage: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
} {
  switch (tier) {
    case 'exceptional':
      return {
        label: 'EXCEPTIONAL',
        percentage: '5%',
        borderColor: 'rgba(139, 92, 246, 0.6)',
        gradientFrom: '#1e293b',
        gradientTo: '#2e1065'
      };
    case 'verified':
      return {
        label: 'VERIFIED',
        percentage: '10%',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        gradientFrom: '#1e293b',
        gradientTo: '#422006'
      };
    case 'complete':
      return {
        label: 'COMPLETE',
        percentage: '25%',
        borderColor: 'rgba(20, 184, 166, 0.4)',
        gradientFrom: '#1e293b',
        gradientTo: '#134e4a'
      };
    default:
      return {
        label: 'STANDARD',
        percentage: '60%',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        gradientFrom: '#1e293b',
        gradientTo: '#0f172a'
      };
  }
}

/**
 * Main function: Map consultation data to Intelligence Card format
 */
export function mapConsultationToCardData(
  rawConsultationData: any,
  userFeedback?: any,
  mdReview?: any
): IntelligenceCardData {
  // Debug logging to trace data flow
  console.log('[mapConsultationToCardData] input:', rawConsultationData);
  console.log('[mapConsultationToCardData] responses:', rawConsultationData?.responses);
  console.log('[mapConsultationToCardData] responses length:', rawConsultationData?.responses?.length);
  console.log('[mapConsultationToCardData] participatingSpecialists:', rawConsultationData?.participatingSpecialists);

  // Handle missing data gracefully
  if (!rawConsultationData) {
    console.error('[mapConsultationToCardData] Missing rawConsultationData - using fallback');
    return createFallbackCardData();
  }

  const responses = rawConsultationData.responses || [];
  const participatingSpecialists = rawConsultationData.participatingSpecialists || [];
  const synthesized = rawConsultationData.synthesizedRecommendations || {};
  const confidenceFactors = synthesized.confidenceFactors || {};
  const prescriptionData = synthesized.prescriptionData || {};

  console.log('[mapConsultationToCardData] Parsed - responses count:', responses.length);
  console.log('[mapConsultationToCardData] Parsed - participatingSpecialists:', participatingSpecialists);
  console.log('[mapConsultationToCardData] Parsed - confidenceFactors:', confidenceFactors);

  // Check for missing responses or specialists and log detailed diagnostics
  if (!responses.length && !participatingSpecialists.length) {
    console.error('[mapConsultationToCardData] No responses or specialists found', {
      hasResponses: !!rawConsultationData.responses,
      responsesIsArray: Array.isArray(rawConsultationData.responses),
      responsesLength: rawConsultationData.responses?.length,
      hasParticipatingSpecialists: !!rawConsultationData.participatingSpecialists,
      participatingSpecialistsIsArray: Array.isArray(rawConsultationData.participatingSpecialists),
      participatingSpecialistsLength: rawConsultationData.participatingSpecialists?.length,
      rawDataKeys: Object.keys(rawConsultationData)
    });
    console.warn('[mapConsultationToCardData] Falling back to mock data due to missing consultation data');
  }

  // Build agent stakes from participating specialists
  const agentStakes: AgentStakeData[] = [];

  // First, try to get stakes from responses
  responses.forEach((resp: any, index: number) => {
    const specialistData = resp.response || resp;
    const specialistTypeRaw = specialistData.specialistType || resp.specialistType || '';
    const specialistType = normalizeSpecialistType(specialistTypeRaw);
    const confidence = specialistData.confidence || resp.confidence || 0.75;

    console.log(`[mapConsultationToCardData] Response ${index}:`, {
      specialistTypeRaw,
      specialistType,
      confidence,
      hasNestedResponse: !!resp.response
    });

    agentStakes.push({
      specialist: specialistType,
      agentName: getAgentDisplayName(specialistType),
      tokenStake: calculateStakeFromConfidence(confidence),
      participated: true,
      color: getAgentColor(specialistType),
      confidence
    });
  });

  console.log('[mapConsultationToCardData] agentStakes after loop:', agentStakes.length, agentStakes);

  // If no responses, build from participatingSpecialists list
  if (agentStakes.length === 0 && participatingSpecialists.length > 0) {
    participatingSpecialists.forEach((spec: string) => {
      const specialistType = normalizeSpecialistType(spec);
      const defaultConfidence = 0.8;

      agentStakes.push({
        specialist: specialistType,
        agentName: getAgentDisplayName(specialistType),
        tokenStake: calculateStakeFromConfidence(defaultConfidence),
        participated: true,
        color: getAgentColor(specialistType),
        confidence: defaultConfidence
      });
    });
  }

  // Sort by stake (highest first) and get total
  agentStakes.sort((a, b) => b.tokenStake - a.tokenStake);
  const totalStake = agentStakes.reduce((sum, agent) => sum + agent.tokenStake, 0);
  const totalStakeRounded = Math.round(totalStake * 10) / 10;

  // Extract consensus percentage
  const consensusRaw = confidenceFactors.interAgentAgreement ||
                       confidenceFactors.overallConfidence ||
                       0.75;
  const consensusPercentage = Math.round(consensusRaw * 100);

  // Extract overall confidence
  const confidenceScore = confidenceFactors.overallConfidence ||
                          (agentStakes.length > 0
                            ? agentStakes.reduce((sum, a) => sum + a.confidence, 0) / agentStakes.length
                            : 0.75);

  // Get highest stake agent for primary prediction
  const highestStakeAgent = agentStakes.length > 0 ? agentStakes[0] : null;
  const primaryPrediction = extractPrimaryPrediction(responses, highestStakeAgent);

  // Determine verification status
  const userFeedbackComplete = !!userFeedback;
  const mdReviewComplete = !!mdReview?.approved;
  const outcomeValidated = userFeedback?.validated || false;
  const mdVerified = mdReviewComplete;

  // Extract evidence grade
  const evidenceGrade = prescriptionData.evidenceBase?.evidenceGrade ||
                        synthesized.evidenceGrade ||
                        undefined;

  // Calculate tier
  const tier = calculateRarityTier({
    participatingCount: agentStakes.length,
    consensusPercentage,
    mdVerified,
    outcomeValidated
  });

  // Generate case ID
  const caseId = rawConsultationData.consultationId ||
                 `OI-${Date.now().toString(36).toUpperCase()}`;

  return {
    caseId,
    timestamp: new Date().toISOString(),
    agentStakes,
    totalStake: totalStakeRounded,
    participatingCount: agentStakes.length,
    consensusPercentage,
    confidenceScore,
    primaryPrediction,
    userFeedbackComplete,
    mdReviewComplete,
    outcomeValidated,
    evidenceGrade,
    mdVerified,
    tier
  };
}

/**
 * Create fallback card data when consultation data is missing
 */
function createFallbackCardData(): IntelligenceCardData {
  return {
    caseId: `OI-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    agentStakes: [{
      specialist: 'triage',
      agentName: 'Triage',
      tokenStake: 5.1,
      participated: true,
      color: AGENT_COLORS.triage,
      confidence: 0.75
    }],
    totalStake: 5.1,
    participatingCount: 1,
    consensusPercentage: 75,
    confidenceScore: 0.75,
    primaryPrediction: {
      text: 'Consultation analysis complete',
      agent: 'OrthoTriage Master',
      stake: 5.1
    },
    userFeedbackComplete: false,
    mdReviewComplete: false,
    outcomeValidated: false,
    evidenceGrade: undefined,
    mdVerified: false,
    tier: 'standard'
  };
}

/**
 * Format timestamp for display
 */
export function formatCardTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Generate NFT metadata for Intelligence Card
 */
export function generateIntelligenceCardNFTMetadata(
  cardData: IntelligenceCardData,
  imageUrl?: string
): Record<string, any> {
  const tierConfig = getTierConfig(cardData.tier);

  return {
    name: `OrthoIQ Intelligence Card #${cardData.caseId}`,
    description: `${cardData.participatingCount}-specialist consultation with ${cardData.consensusPercentage}% consensus${cardData.mdVerified ? ', MD verified' : ''}${cardData.evidenceGrade ? `, Grade ${cardData.evidenceGrade} evidence` : ''}`,
    image: imageUrl || '',
    attributes: [
      { trait_type: 'Tier', value: tierConfig.label },
      { trait_type: 'Tier Rarity', value: tierConfig.percentage },
      { trait_type: 'Specialists', value: cardData.participatingCount },
      { trait_type: 'Consensus', value: `${cardData.consensusPercentage}%` },
      { trait_type: 'Total Stake', value: `${cardData.totalStake} tokens` },
      { trait_type: 'MD Verified', value: cardData.mdVerified ? 'Yes' : 'No' },
      { trait_type: 'Evidence Grade', value: cardData.evidenceGrade || 'N/A' },
      { trait_type: 'Outcome Validated', value: cardData.outcomeValidated ? 'Yes' : 'No' },
      { trait_type: 'Primary Predictor', value: cardData.primaryPrediction.agent }
    ],
    properties: {
      caseId: cardData.caseId,
      timestamp: cardData.timestamp,
      chain: 'Base',
      collection: 'OrthoIQ Intelligence Cards',
      category: 'Medical AI',
      royalty: '5%',
      trackingUrl: `https://orthoiq.app/track/${cardData.caseId}`
    }
  };
}
