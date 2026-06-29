import { EquipoiseCard } from './types';

// Normalize the backend read-endpoint response into a flat card array. Accepts
// { cards }, { equipoiseCards }, or a bare array.
function extractCards(data: any): EquipoiseCard[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as EquipoiseCard[];
  if (Array.isArray(data.cards)) return data.cards as EquipoiseCard[];
  if (Array.isArray(data.equipoiseCards)) return data.equipoiseCards as EquipoiseCard[];
  return [];
}

// Module-level cache so a consultation polls ONCE per page session: the first
// hook instance runs the poll, later mounts (re-renders, navigation back) read
// the populated cards synchronously. `inflight` dedupes concurrent pollers.
const cardCache = new Map<string, EquipoiseCard[]>();
const inflight = new Map<string, Promise<EquipoiseCard[] | null>>();

export function getCachedEquipoiseCards(consultationId: string): EquipoiseCard[] | null {
  return cardCache.get(consultationId) ?? null;
}

export interface PollEquipoiseCardsOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

async function runPoll(
  consultationId: string,
  expectedCount: number,
  intervalMs: number,
  timeoutMs: number
): Promise<EquipoiseCard[] | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`/api/consultation/${consultationId}/equipoise-cards`);
      if (res.ok) {
        const data = await res.json();
        const cards = extractCards(data);
        // Honor the backend's own readiness flag when present — don't swap in
        // cards whose ledgers are still being compiled (ready === false).
        const ready = data && typeof data === 'object' && 'ready' in data ? !!data.ready : true;
        if (ready && expectedCount > 0 && cards.length >= expectedCount) {
          cardCache.set(consultationId, cards);
          return cards;
        }
      }
    } catch {
      // network blip — keep polling
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return null;
}

// Resolve the populated cards for a consultation, polling at most once across
// all callers. Returns the cached set immediately if present, joins an in-flight
// poll if one is running, otherwise starts one. Returns null on timeout (and
// clears the in-flight slot so a later mount can retry).
export function resolveEquipoiseCards(
  consultationId: string,
  expectedCount: number,
  options: PollEquipoiseCardsOptions = {}
): Promise<EquipoiseCard[] | null> {
  const cached = cardCache.get(consultationId);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(consultationId);
  if (existing) return existing;

  const { intervalMs = 5000, timeoutMs = 60000 } = options;
  const p = runPoll(consultationId, expectedCount, intervalMs, timeoutMs).finally(() => {
    inflight.delete(consultationId);
  });
  inflight.set(consultationId, p);
  return p;
}
