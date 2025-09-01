import { PrescriptionData, PrescriptionMetadata, PrescriptionTheme, ParsedResponse, RarityConfig } from './types';

export const RARITY_CONFIGS: RarityConfig[] = [
  {
    name: 'common',
    probability: 0.70,
    theme: {
      primaryColor: '#3b82f6',
      accentColor: '#1e40af',
      borderStyle: 'border-2 border-blue-200',
      effects: [],
      logoVariant: 'blue'
    }
  },
  {
    name: 'uncommon',
    probability: 0.20,
    theme: {
      primaryColor: '#0891b2',
      accentColor: '#0e7490',
      borderStyle: 'border-2 border-teal-300 shadow-md',
      effects: ['bg-gradient-to-br from-teal-50 to-cyan-50'],
      logoVariant: 'teal'
    }
  },
  {
    name: 'rare',
    probability: 0.08,
    theme: {
      primaryColor: '#f59e0b',
      accentColor: '#d97706',
      borderStyle: 'border-3 border-amber-400 shadow-lg',
      effects: ['bg-gradient-to-br from-amber-50 to-yellow-50', 'ring-2 ring-amber-200'],
      logoVariant: 'gold'
    },
    minConfidence: 0.8
  },
  {
    name: 'ultra-rare',
    probability: 0.02,
    theme: {
      primaryColor: '#8b5cf6',
      accentColor: '#7c3aed',
      borderStyle: 'border-4 border-purple-400 shadow-xl',
      effects: [
        'bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50',
        'ring-4 ring-purple-200',
        'animate-pulse'
      ],
      logoVariant: 'gold'
    },
    minConfidence: 0.9
  }
];

export function parseClaudeResponse(response: string, claudeResponse?: { inquiry?: string; keyPoints?: string[]; userQuestion?: string }): ParsedResponse {
  // Try to parse as JSON first (new structured format)
  let parsedJSON: any = null;
  try {
    parsedJSON = JSON.parse(response);
  } catch {
    // Not JSON, continue with text parsing
  }

  // If we have structured data from Claude, use it
  if (claudeResponse?.inquiry && claudeResponse?.keyPoints) {
    return {
      chiefComplaint: claudeResponse.inquiry,
      assessment: claudeResponse.keyPoints.slice(0, 2) || ['AI-generated assessment points available'],
      recommendations: claudeResponse.keyPoints.slice(2, 4) || ['AI-generated recommendations available'],
      disclaimers: ['This is AI-generated information. Consult a healthcare provider.'],
      inquiry: claudeResponse.inquiry,
      keyPoints: claudeResponse.keyPoints
    };
  }

  // If we have JSON with new fields, use them
  if (parsedJSON?.inquiry && parsedJSON?.keyPoints) {
    return {
      chiefComplaint: parsedJSON.inquiry,
      assessment: parsedJSON.keyPoints.slice(0, 2) || ['AI-generated assessment points available'],
      recommendations: parsedJSON.keyPoints.slice(2, 4) || ['AI-generated recommendations available'],
      disclaimers: ['This is AI-generated information. Consult a healthcare provider.'],
      inquiry: parsedJSON.inquiry,
      keyPoints: parsedJSON.keyPoints
    };
  }

  // Fallback to legacy text parsing
  const lines = response.split('\n').filter(line => line.trim());
  
  let chiefInquiry = '';
  const assessment: string[] = [];
  const recommendations: string[] = [];
  const disclaimers: string[] = [];
  
  let currentSection = 'assessment';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Detect section headers
    if (trimmed.toLowerCase().includes('recommendation') || 
        trimmed.toLowerCase().includes('treatment') ||
        trimmed.toLowerCase().includes('suggest')) {
      currentSection = 'recommendations';
      continue;
    }
    
    if (trimmed.toLowerCase().includes('disclaimer') ||
        trimmed.toLowerCase().includes('consult') ||
        trimmed.toLowerCase().includes('medical professional')) {
      currentSection = 'disclaimers';
    }
    
    // Extract content based on current section
    if (currentSection === 'assessment') {
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        assessment.push(trimmed.substring(1).trim());
      } else if (trimmed.length > 20) {
        assessment.push(trimmed);
      }
    } else if (currentSection === 'recommendations') {
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        recommendations.push(trimmed.substring(1).trim());
      } else if (trimmed.length > 10) {
        recommendations.push(trimmed);
      }
    } else if (currentSection === 'disclaimers') {
      disclaimers.push(trimmed);
    }
  }
  
  // If no structured content found, use the entire response as assessment
  if (assessment.length === 0 && recommendations.length === 0) {
    const sentences = response.split('.').filter(s => s.trim().length > 10);
    assessment.push(...sentences.slice(0, 3).map(s => s.trim() + '.'));
    if (sentences.length > 3) {
      recommendations.push(...sentences.slice(3, 6).map(s => s.trim() + '.'));
    }
  }
  
  return {
    chiefComplaint: chiefInquiry || claudeResponse?.inquiry || claudeResponse?.userQuestion || 'Medical consultation inquiry',
    assessment: assessment.length ? assessment : ['Medical assessment available'],
    recommendations: recommendations.length ? recommendations : ['Treatment recommendations available'],
    disclaimers: disclaimers.length ? disclaimers : ['This is AI-generated information. Consult a healthcare provider.']
  };
}

export function calculateRarity(confidence: number, questionComplexity: number): RarityConfig {
  // Calculate base probability multiplier based on confidence and complexity
  const confidenceBonus = confidence > 0.8 ? 1.2 : confidence > 0.6 ? 1.0 : 0.8;
  const complexityBonus = questionComplexity > 100 ? 1.3 : questionComplexity > 50 ? 1.1 : 1.0;
  
  const random = Math.random();
  let cumulativeProbability = 0;
  
  // Adjust probabilities based on confidence and complexity
  for (const rarity of [...RARITY_CONFIGS].reverse()) {
    if (rarity.minConfidence && confidence < rarity.minConfidence) {
      continue;
    }
    
    let adjustedProbability = rarity.probability;
    if (rarity.name === 'rare' || rarity.name === 'ultra-rare') {
      adjustedProbability *= confidenceBonus * complexityBonus;
    }
    
    cumulativeProbability += adjustedProbability;
    if (random <= cumulativeProbability) {
      return rarity;
    }
  }
  
  return RARITY_CONFIGS[0]; // Default to common
}

export function generatePrescriptionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `OIQ-${timestamp}-${random}`.toUpperCase();
}

export function generateVerificationHash(data: PrescriptionData): string {
  const content = `${data.userQuestion}${data.claudeResponse}${data.timestamp}${data.fid}`;
  
  // Simple hash function for demo purposes
  // In production, use a proper cryptographic hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).toUpperCase().substring(0, 8);
}

export function calculateQuestionComplexity(question: string): number {
  let complexity = question.length;
  
  // Medical terminology increases complexity
  const medicalTerms = [
    'arthritis', 'fracture', 'ligament', 'tendon', 'cartilage', 'meniscus',
    'rotator cuff', 'ACL', 'MCL', 'patella', 'femur', 'tibia', 'fibula',
    'vertebrae', 'disc', 'sciatica', 'osteoporosis', 'inflammation'
  ];
  
  const foundTerms = medicalTerms.filter(term => 
    question.toLowerCase().includes(term.toLowerCase())
  );
  
  complexity += foundTerms.length * 10;
  
  // Multiple symptoms or body parts increase complexity
  const bodyParts = question.toLowerCase().match(/(knee|shoulder|back|hip|ankle|elbow|wrist)/g);
  if (bodyParts && bodyParts.length > 1) {
    complexity += 20;
  }
  
  // Time references add complexity
  if (question.toLowerCase().includes('chronic') || 
      question.toLowerCase().includes('months') ||
      question.toLowerCase().includes('years')) {
    complexity += 15;
  }
  
  return Math.min(complexity, 200); // Cap at 200
}

export function generateMetadata(prescriptionData: PrescriptionData, rarity: RarityConfig): PrescriptionMetadata {
  const watermarkType = rarity.name === 'common' ? 'none' : 
                       rarity.name === 'uncommon' ? 'medical_pattern' :
                       rarity.name === 'rare' ? 'gold_caduceus' : 'holographic';

  return {
    id: generatePrescriptionId(),
    rarity: rarity.name,
    theme: rarity.theme,
    generatedAt: new Date().toISOString(),
    verificationHash: generateVerificationHash(prescriptionData),
    patientId: `ANON-${prescriptionData.fid}`,
    prescriberId: 'ORTHOIQ-AI-001',
    watermarkType
  };
}