import { createHash } from 'crypto';
import { getSql } from '../database';
import { getPromisResponses } from '../promisDb';
import { isPainRelatedConsultation, calculateDelta } from '../promis';
import { PROMISTimepoint } from '../promisTypes';

export const PROMIS_MCID = 5;

export interface ReadoutContext {
  consultationId: string;
  timepoint: PROMISTimepoint;
  bodyPart: string | null;
  consultationDate: string;
  daysFromBaseline: number;
  weekNumber: number;
  isPainRelated: boolean;

  baseline: {
    physicalFunctionTScore: number;
    painInterferenceTScore: number | null;
  };
  current: {
    physicalFunctionTScore: number;
    painInterferenceTScore: number | null;
  };
  delta: {
    physicalFunction: number;          // positive = improvement
    painInterference: number | null;   // positive = improvement (reversed)
    isClinicallyMeaningful: boolean;
  };

  keyFindings: string[];
  suggestedFollowUp: string[];

  mcidThreshold: number;

  contextHash: string;
}

function parseFindings(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((f) => (typeof f === 'string' ? f : f?.finding || f?.text || ''))
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .slice(0, 5);
  }
  return [];
}

function parseFollowUp(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((f) => (typeof f === 'string' ? f : f?.question || f?.text || ''))
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .slice(0, 5);
  }
  return [];
}

function hashContext(input: Record<string, unknown>): string {
  const json = JSON.stringify(input, Object.keys(input).sort());
  return createHash('sha256').update(json).digest('hex').slice(0, 32);
}

const TIMEPOINT_WEEK: Record<PROMISTimepoint, number | null> = {
  baseline: 0,
  '2week': 2,
  '4week': 4,
  '8week': 8,
};

export async function buildReadoutContext(
  consultationId: string,
  timepoint: PROMISTimepoint,
): Promise<ReadoutContext | { error: string }> {
  if (timepoint === 'baseline') {
    return { error: 'Readout not generated for baseline.' };
  }
  const weekNumber = TIMEPOINT_WEEK[timepoint] ?? 0;

  const sql = getSql();

  // Consultation row
  const consultRows = await sql`
    SELECT consultation_id, body_part, created_at, question_id
    FROM consultations WHERE consultation_id = ${consultationId} LIMIT 1
  `;
  if (consultRows.length === 0) return { error: 'Consultation not found' };
  const consultation = consultRows[0];

  // Question text (used for pain-relevance heuristic)
  let questionText: string | null = null;
  if (consultation.question_id) {
    const qRows = await sql`SELECT question FROM questions WHERE id = ${consultation.question_id} LIMIT 1`;
    questionText = qRows[0]?.question || null;
  }

  // PROMIS rows
  const promisRows = await getPromisResponses(consultationId);
  const baseline = promisRows.find((r: any) => r.timepoint === 'baseline');
  const current = promisRows.find((r: any) => r.timepoint === timepoint);
  if (!baseline || !current) {
    return { error: 'Baseline or current PROMIS response missing.' };
  }

  const isPainRelated = isPainRelatedConsultation({ question: questionText });

  const baselineScores = {
    physicalFunctionTScore: Number(baseline.physical_function_t_score),
    painInterferenceTScore: isPainRelated && baseline.pain_interference_t_score != null
      ? Number(baseline.pain_interference_t_score)
      : null,
  };
  const currentScores = {
    physicalFunctionTScore: Number(current.physical_function_t_score),
    painInterferenceTScore: isPainRelated && current.pain_interference_t_score != null
      ? Number(current.pain_interference_t_score)
      : null,
  };

  // Reuse the canonical delta calculator from lib/promis.ts
  const delta = calculateDelta(
    {
      physicalFunctionRawScore: baseline.physical_function_raw_score,
      physicalFunctionTScore: baselineScores.physicalFunctionTScore,
      painInterferenceRawScore: baseline.pain_interference_raw_score ?? null,
      painInterferenceTScore: baselineScores.painInterferenceTScore,
    },
    {
      physicalFunctionRawScore: current.physical_function_raw_score,
      physicalFunctionTScore: currentScores.physicalFunctionTScore,
      painInterferenceRawScore: current.pain_interference_raw_score ?? null,
      painInterferenceTScore: currentScores.painInterferenceTScore,
    },
  );

  // Triage agent's keyFindings / followUpQuestions from result_data
  let keyFindings: string[] = [];
  let suggestedFollowUp: string[] = [];
  try {
    const agentRows = await sql`
      SELECT result_data FROM agent_tasks
      WHERE consultation_id = ${consultationId}
      ORDER BY created_at ASC
    `;
    for (const row of agentRows) {
      const data = row.result_data;
      if (!data) continue;
      const f = parseFindings(data.keyFindings ?? data.triage?.keyFindings);
      const fu = parseFollowUp(
        data.suggestedFollowUp
          ?? data.followUpQuestions
          ?? data.triage?.followUpQuestions
          ?? data.synthesizedRecommendations?.suggestedFollowUp,
      );
      if (f.length > 0 && keyFindings.length === 0) keyFindings = f;
      if (fu.length > 0 && suggestedFollowUp.length === 0) suggestedFollowUp = fu;
      if (keyFindings.length > 0 && suggestedFollowUp.length > 0) break;
    }
  } catch (e) {
    console.warn('readoutContext: failed to load agent_tasks findings:', e);
  }

  const consultationDate = new Date(consultation.created_at).toISOString();
  const daysFromBaseline = Math.floor(
    (new Date(current.created_at).getTime() - new Date(consultation.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const contextForHash = {
    consultationId,
    timepoint,
    bodyPart: consultation.body_part || null,
    baselineScores,
    currentScores,
    delta,
    keyFindings,
    suggestedFollowUp,
  };

  return Object.freeze({
    consultationId,
    timepoint,
    bodyPart: consultation.body_part || null,
    consultationDate,
    daysFromBaseline,
    weekNumber,
    isPainRelated,
    baseline: baselineScores,
    current: currentScores,
    delta: {
      physicalFunction: delta.physicalFunction,
      painInterference: delta.painInterference,
      isClinicallyMeaningful: delta.isClinicallyMeaningful,
    },
    keyFindings,
    suggestedFollowUp,
    mcidThreshold: PROMIS_MCID,
    contextHash: hashContext(contextForHash),
  });
}
