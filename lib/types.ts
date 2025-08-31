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