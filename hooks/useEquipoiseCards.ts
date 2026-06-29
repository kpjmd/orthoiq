'use client';

import { useState, useEffect, useRef } from 'react';
import { EquipoiseCard } from '@/lib/types';
import { resolveEquipoiseCards, getCachedEquipoiseCards } from '@/lib/equipoiseCardsService';

interface UseEquipoiseCardsOptions {
  enabled: boolean;
  consultationId?: string;
  // Card skeletons from the live consult response (evidenceLedger: []).
  skeletons: EquipoiseCard[];
}

interface EquipoiseCardsState {
  cards: EquipoiseCard[]; // skeletons until the populated set arrives, then populated
  ledgersReady: boolean;  // true once the persisted cards (with ledgers) are swapped in
}

// Renders skeletons immediately, then resolves the populated cards (with
// evidence ledgers) via the cached single-flight poll. On remount, the cached
// set restores synchronously — no re-poll.
export function useEquipoiseCards({
  enabled,
  consultationId,
  skeletons,
}: UseEquipoiseCardsOptions): EquipoiseCardsState {
  const [populated, setPopulated] = useState<EquipoiseCard[] | null>(() =>
    consultationId ? getCachedEquipoiseCards(consultationId) : null
  );
  const abortRef = useRef(false);

  const expectedCount = skeletons.length;

  useEffect(() => {
    abortRef.current = false;
    if (!enabled || !consultationId || expectedCount === 0) return;

    const cached = getCachedEquipoiseCards(consultationId);
    if (cached) {
      setPopulated(cached);
      return;
    }

    resolveEquipoiseCards(consultationId, expectedCount).then(cards => {
      if (!abortRef.current && cards) setPopulated(cards);
    });

    return () => {
      abortRef.current = true;
    };
  }, [enabled, consultationId, expectedCount]);

  return {
    cards: populated ?? skeletons,
    ledgersReady: populated !== null,
  };
}
