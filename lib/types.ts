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