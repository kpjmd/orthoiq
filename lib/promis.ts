// PROMIS (Patient-Reported Outcomes Measurement Information System) Scoring Utilities
// Physical Function Short Form 10a + Pain Interference Short Form 6a

import { PROMISInstrument, PROMISQuestion, PROMISScores, PROMISDelta, PROMISTimepoint, PROMISInterpretationBand } from './types';

// ── Physical Function 10a Questions ──

export const PHYSICAL_FUNCTION_QUESTIONS: PROMISQuestion[] = [
  { id: 'PFA11', text: 'Do chores such as vacuuming or yard work', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFA21', text: 'Go up and down stairs at a normal pace', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFA23', text: 'Go for a walk of at least 15 minutes', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFA53', text: 'Run errands and shop', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFB1', text: 'Exercise for an hour', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFC12', text: 'Walk for more than an hour', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFC13', text: 'Run or jog for two miles', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFC36', text: 'Do two hours of physical labor', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFC37', text: 'Exercise hard for half an hour', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
  { id: 'PFC56', text: 'Stand without support for 30 minutes', stem: 'Are you able to...', scaleLabels: ['Unable to do', 'With much difficulty', 'With some difficulty', 'With little difficulty', 'Without difficulty'] },
];

// ── Pain Interference 6a Questions ──

export const PAIN_INTERFERENCE_QUESTIONS: PROMISQuestion[] = [
  { id: 'PAININ9', text: 'How much did pain interfere with your day to day activities?', stem: 'In the past 7 days...', scaleLabels: ['Not at all', 'A little bit', 'Somewhat', 'Quite a bit', 'Very much'] },
  { id: 'PAININ22', text: 'How much did pain interfere with work around the home?', stem: 'In the past 7 days...', scaleLabels: ['Not at all', 'A little bit', 'Somewhat', 'Quite a bit', 'Very much'] },
  { id: 'PAININ31', text: 'How much did pain interfere with your ability to participate in social activities?', stem: 'In the past 7 days...', scaleLabels: ['Not at all', 'A little bit', 'Somewhat', 'Quite a bit', 'Very much'] },
  { id: 'PAININ34', text: 'How much did pain interfere with your household chores?', stem: 'In the past 7 days...', scaleLabels: ['Not at all', 'A little bit', 'Somewhat', 'Quite a bit', 'Very much'] },
  { id: 'PAININ36', text: 'How much did pain interfere with your enjoyment of recreational activities?', stem: 'In the past 7 days...', scaleLabels: ['Not at all', 'A little bit', 'Somewhat', 'Quite a bit', 'Very much'] },
  { id: 'PAININ37', text: 'How much did pain interfere with your family life?', stem: 'In the past 7 days...', scaleLabels: ['Not at all', 'A little bit', 'Somewhat', 'Quite a bit', 'Very much'] },
];

// ── T-Score Lookup Tables ──
// Physical Function: raw 10-50 → T-score (higher = better function)
const PF_TSCORE_TABLE: [number, number][] = [
  [10, 21.2], [11, 22.6], [12, 23.8], [13, 25.0], [14, 26.1],
  [15, 28.5], [16, 29.2], [17, 29.9], [18, 30.7], [19, 31.7],
  [20, 32.8], [21, 33.5], [22, 34.2], [23, 34.9], [24, 35.5],
  [25, 36.2], [26, 36.9], [27, 37.5], [28, 38.2], [29, 38.8],
  [30, 39.4], [31, 40.1], [32, 40.8], [33, 41.4], [34, 42.1],
  [35, 42.9], [36, 43.6], [37, 44.3], [38, 45.2], [39, 46.2],
  [40, 47.3], [41, 48.2], [42, 49.1], [43, 50.2], [44, 51.3],
  [45, 53.5], [46, 54.7], [47, 55.9], [48, 57.4], [49, 59.3],
  [50, 61.5],
];

// Pain Interference: raw 6-30 → T-score (higher = worse pain)
const PI_TSCORE_TABLE: [number, number][] = [
  [6, 38.6], [7, 40.7], [8, 42.5], [9, 44.3], [10, 47.8],
  [11, 49.1], [12, 50.8], [13, 52.5], [14, 54.4], [15, 55.8],
  [16, 57.1], [17, 58.5], [18, 59.9], [19, 61.2], [20, 62.6],
  [21, 63.9], [22, 65.3], [23, 66.6], [24, 68.0], [25, 69.5],
  [26, 71.1], [27, 72.6], [28, 74.2], [29, 76.0], [30, 77.8],
];

/**
 * Calculate raw score from a set of responses (sum of values)
 */
export function calculateRawScore(responses: Record<string, number>): number {
  return Object.values(responses).reduce((sum, val) => sum + val, 0);
}

/**
 * Linear interpolation between T-score table entries
 */
function interpolateTScore(table: [number, number][], rawScore: number): number {
  // Clamp to table bounds
  const minRaw = table[0][0];
  const maxRaw = table[table.length - 1][0];
  if (rawScore <= minRaw) return table[0][1];
  if (rawScore >= maxRaw) return table[table.length - 1][1];

  // Find surrounding entries
  for (let i = 0; i < table.length - 1; i++) {
    const [r1, t1] = table[i];
    const [r2, t2] = table[i + 1];
    if (rawScore >= r1 && rawScore <= r2) {
      // Linear interpolation
      const fraction = (rawScore - r1) / (r2 - r1);
      return Math.round((t1 + fraction * (t2 - t1)) * 10) / 10;
    }
  }

  return table[table.length - 1][1];
}

/**
 * Look up T-score for a given instrument and raw score
 */
export function lookupTScore(instrument: PROMISInstrument, rawScore: number): number {
  const table = instrument === 'physicalFunction' ? PF_TSCORE_TABLE : PI_TSCORE_TABLE;
  return interpolateTScore(table, rawScore);
}

/**
 * Calculate delta between baseline and follow-up scores
 * Returns positive values for improvement in both instruments
 */
export function calculateDelta(baseline: PROMISScores, followup: PROMISScores): PROMISDelta {
  // Physical Function: higher is better, so followup - baseline = improvement
  const pfDelta = followup.physicalFunctionTScore - baseline.physicalFunctionTScore;

  // Pain Interference: lower is better, so baseline - followup = improvement
  let piDelta: number | null = null;
  if (baseline.painInterferenceTScore != null && followup.painInterferenceTScore != null) {
    piDelta = baseline.painInterferenceTScore - followup.painInterferenceTScore;
  }

  return {
    physicalFunction: Math.round(pfDelta * 10) / 10,
    painInterference: piDelta != null ? Math.round(piDelta * 10) / 10 : null,
    isClinicallyMeaningful: Math.abs(pfDelta) >= 5 || (piDelta != null && Math.abs(piDelta) >= 5),
  };
}

/**
 * Physical Function interpretation bands
 */
export function getPhysicalFunctionBand(tScore: number): PROMISInterpretationBand {
  if (tScore > 55) return { label: 'Above Average', description: 'Better physical function than the general population', color: '#10b981' };
  if (tScore >= 45) return { label: 'Average', description: 'Physical function similar to the general population', color: '#3b82f6' };
  if (tScore >= 35) return { label: 'Slightly Below Average', description: 'Somewhat limited physical function', color: '#f59e0b' };
  return { label: 'Below Average', description: 'Significantly limited physical function', color: '#ef4444' };
}

/**
 * Pain Interference interpretation bands
 */
export function getPainInterferenceBand(tScore: number): PROMISInterpretationBand {
  if (tScore < 45) return { label: 'Minimal Impact', description: 'Pain has little effect on daily life', color: '#10b981' };
  if (tScore <= 55) return { label: 'Moderate Impact', description: 'Pain moderately affects daily activities', color: '#f59e0b' };
  return { label: 'Significant Impact', description: 'Pain significantly interferes with daily life', color: '#ef4444' };
}

/**
 * Determine if a consultation is pain-related based on case data.
 * Used by WebOrthoInterface, miniapp, and API route — never duplicated inline.
 */
export function isPainRelatedConsultation(caseData: any): boolean {
  if (!caseData) return false;

  // Check painLevel / pain_level
  const painLevel = caseData.painLevel ?? caseData.pain_level ?? 0;
  if (typeof painLevel === 'number' && painLevel > 0) return true;

  // Check text fields for pain keywords
  const painKeywords = /\b(pain|ache|sore|hurt|hurting|painful|aching)\b/i;
  const textFields = [
    caseData.symptoms,
    caseData.primaryComplaint,
    caseData.primary_complaint,
    caseData.question,
    caseData.userQuestion,
    caseData.rawQuery,
  ];

  for (const field of textFields) {
    if (typeof field === 'string' && painKeywords.test(field)) return true;
  }

  return false;
}

/**
 * Validate that all questions in an instrument have been answered
 */
export function validateResponses(
  instrument: PROMISInstrument,
  responses: Record<string, number>
): boolean {
  const questions = instrument === 'physicalFunction'
    ? PHYSICAL_FUNCTION_QUESTIONS
    : PAIN_INTERFERENCE_QUESTIONS;

  return questions.every(q => {
    const val = responses[q.id];
    return typeof val === 'number' && val >= 1 && val <= 5;
  });
}

/**
 * Compute full scores for an instrument given responses
 */
export function computeScores(
  instrument: PROMISInstrument,
  responses: Record<string, number>
): { rawScore: number; tScore: number } {
  const rawScore = calculateRawScore(responses);
  const tScore = lookupTScore(instrument, rawScore);
  return { rawScore, tScore };
}
