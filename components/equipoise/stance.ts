import { EquipoiseDecision } from '@/lib/types';

// Normalize a stance to a display label. `panel[].stance` is the enum
// (option_a/option_b/abstain); `theSplit[].stance` is already a raw option
// label, so it falls through unchanged.
export function stanceLabel(decision: EquipoiseDecision, stance: string): string {
  if (stance === 'option_a') return decision.optionA || 'Option A';
  if (stance === 'option_b') return decision.optionB || 'Option B';
  if (stance === 'abstain') return 'Deferred';
  return stance;
}

// Stable ordering for stance groups: option A, option B, then deferrals.
export function stanceRank(stance: string): number {
  if (stance === 'option_a') return 0;
  if (stance === 'option_b') return 1;
  if (stance === 'abstain') return 2;
  return 3;
}
