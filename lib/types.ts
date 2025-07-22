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
}

export interface ArtworkConfig {
  theme: 'bone' | 'muscle' | 'joint' | 'general';
  colors: string[];
  elements: string[];
}