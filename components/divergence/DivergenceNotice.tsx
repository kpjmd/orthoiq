'use client';

import { useState } from 'react';
import { DivergenceRecord } from '@/lib/types';
import { DivergenceCard } from './DivergenceCard';

// In-consult notice shown above the result brief when the panel deliberated on
// one or more contested decisions. Collapsed by default; expands to the full
// play-by-play (shared DivergenceCard). Renders nothing when there are none.

export function DivergenceNotice({ divergences }: { divergences?: DivergenceRecord[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!divergences || divergences.length === 0) return null;

  const count = divergences.length;
  const anyPersisted = divergences.some((d) => d.persisted);

  return (
    <div
      className={`rounded-lg border mb-4 overflow-hidden ${
        anyPersisted ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Your panel deliberated on {count} contested decision{count === 1 ? '' : 's'}
            </div>
            <div className="text-xs text-gray-600">
              {anyPersisted
                ? 'The specialists reached genuine clinical equipoise on at least one — a real, unresolved debate.'
                : 'The specialists initially disagreed, then converged after discussing the evidence.'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {anyPersisted && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
              Equipoise held
            </span>
          )}
          <span className="text-xs font-medium text-gray-500">{expanded ? 'Hide' : 'View'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {divergences.map((d, i) => (
            <DivergenceCard key={d.id ?? `${d.decisionPointId}-${i}`} record={d} />
          ))}
        </div>
      )}
    </div>
  );
}
