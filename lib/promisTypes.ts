// ── PROMIS (Patient-Reported Outcomes) Types ──
// Extracted from lib/types.ts to avoid Vercel build resolution issues with large files.

export type PROMISInstrument = 'physicalFunction' | 'painInterference';
export type PROMISTimepoint = 'baseline' | '2week' | '4week' | '8week';

export interface PROMISQuestion {
  id: string;
  text: string;
  stem: string;
  scaleLabels: string[]; // 5 labels, index 0 = score 1, index 4 = score 5
}

export interface PROMISScores {
  physicalFunctionRawScore: number;
  physicalFunctionTScore: number;
  painInterferenceRawScore: number | null;
  painInterferenceTScore: number | null;
}

export interface PROMISDelta {
  physicalFunction: number; // positive = improvement
  painInterference: number | null; // positive = improvement (reversed)
  isClinicallyMeaningful: boolean; // >= 5 T-score points in either
}

export interface PROMISInterpretationBand {
  label: string;
  description: string;
  color: string;
}

export interface PROMISResponseData {
  consultationId: string;
  patientId: string;
  timepoint: PROMISTimepoint;
  physicalFunctionResponses: Record<string, number>;
  physicalFunctionRawScore: number;
  physicalFunctionTScore: number;
  painInterferenceResponses: Record<string, number> | null;
  painInterferenceRawScore: number | null;
  painInterferenceTScore: number | null;
}

export interface PROMISCompletionResult {
  scores: PROMISScores;
  delta?: PROMISDelta;
}
