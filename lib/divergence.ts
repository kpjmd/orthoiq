import {
  DivergenceRecord,
  DivergenceSide,
  DivergenceDialogueEntry,
  DivergencePostDialogue,
  DivergenceDeferred,
  ContentDivergence,
} from './types';

// ---------------------------------------------------------------------------
// normalizeLiveDivergence
//
// Maps a live status-payload divergence entry (nested, richer shape from
// result.synthesizedRecommendations.coordinationMetadata.divergences) into the
// canonical `DivergenceRecord` consumed by the shared UI. The live shape nests
// decisionPoint{...} and postDialogue{...} and carries bonus fields
// (decisionPoint.rationale, deferred, belowFloor) that the DB table omits.
//
// Defensive: the backend guarantees the array is present, but individual fields
// are read with fallbacks so a partially-populated entry never throws in render.
// ---------------------------------------------------------------------------

interface LiveDecisionPoint {
  id?: string;
  question?: string;
  options?: string[];
  rationale?: string;
}

interface LivePostDialogue {
  resolved?: boolean;
  persisted?: boolean;
  distinctFinalStances?: string[];
  changedCount?: number;
  deltas?: DivergencePostDialogue['deltas'];
}

export interface LiveDivergence {
  decisionPoint?: LiveDecisionPoint;
  sides?: DivergenceSide[];
  deferred?: DivergenceDeferred[];
  belowFloor?: number;
  dialogue?: DivergenceDialogueEntry[];
  postDialogue?: LivePostDialogue;
}

export function normalizeLiveDivergence(
  d: LiveDivergence,
  consultationId: string
): DivergenceRecord {
  const decisionPoint = d.decisionPoint ?? {};
  const post = d.postDialogue ?? {};

  const postDialogue: DivergencePostDialogue = {
    resolved: post.resolved ?? false,
    persisted: post.persisted ?? false,
    distinctFinalStances: post.distinctFinalStances ?? [],
    changedCount: post.changedCount ?? 0,
    deltas: post.deltas ?? [],
  };

  return {
    consultationId,
    decisionPointId: decisionPoint.id ?? '',
    decisionQuestion: decisionPoint.question ?? '',
    decisionOptions: decisionPoint.options ?? [],
    // lift postDialogue outcome flags to the top level so the shared card reads
    // them identically for DB- and live-sourced records.
    persisted: postDialogue.persisted,
    resolved: postDialogue.resolved,
    changedCount: postDialogue.changedCount,
    sides: d.sides ?? [],
    dialogue: d.dialogue ?? [],
    postDialogue,
    // live-only bonuses (rendered only when present):
    decisionRationale: decisionPoint.rationale,
    deferred: d.deferred,
    belowFloor: d.belowFloor,
  };
}

export function normalizeLiveDivergences(
  divergences: unknown,
  consultationId: string
): DivergenceRecord[] {
  if (!Array.isArray(divergences)) return [];
  return divergences.map((d) => normalizeLiveDivergence(d as LiveDivergence, consultationId));
}

// ---------------------------------------------------------------------------
// toContentDivergence / toContentDivergences
//
// Project the canonical `DivergenceRecord` down to the lean `ContentDivergence`
// shape forwarded through the external batch content payload
// (GET /api/v1/consult/[jobId]). Keeps the contested question, its options, the
// outcome flags, and just who-stood-where (display name + stable machine key +
// evidence grade + confidence) — dropping reasoning prose, dialogue, deltas,
// deferred/belowFloor, and internal IDs.
// ---------------------------------------------------------------------------
export function toContentDivergence(record: DivergenceRecord): ContentDivergence {
  return {
    decisionQuestion: record.decisionQuestion,
    options: record.decisionOptions,
    persisted: record.persisted,
    resolved: record.resolved,
    changedCount: record.changedCount,
    sides: record.sides.map((side) => ({
      stance: side.stance,
      specialists: side.specialists.map((s) => ({
        specialist: s.specialist,
        specialistType: s.specialistType,
        evidenceGrade: s.evidenceGrade,
        confidence: s.confidence,
      })),
    })),
  };
}

// Convenience: flatten the nested live divergence shape via the existing
// normalizer, then project each entry. Returns [] for missing/non-array input.
export function toContentDivergences(
  raw: unknown,
  consultationId: string
): ContentDivergence[] {
  return normalizeLiveDivergences(raw, consultationId).map(toContentDivergence);
}
