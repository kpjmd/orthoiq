'use client';

import { DivergenceRecord, DivergenceSide, EvidenceGrade } from '@/lib/types';

// Shared "conference card" — renders one divergence in full. Consumed by the
// admin per-consult detail view AND the live in-consult panel. Works identically
// for DB-sourced and live-sourced records (live-only extras render when present).

const GRADE_STYLES: Record<EvidenceGrade, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-red-100 text-red-700',
  none: 'bg-gray-100 text-gray-600',
};

function pct(confidence: number): string {
  return `${Math.round((confidence ?? 0) * 100)}%`;
}

function EvidenceChip({ grade }: { grade: EvidenceGrade }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${GRADE_STYLES[grade] || GRADE_STYLES.none}`}>
      {grade === 'none' ? 'No grade' : `Grade ${grade}`}
    </span>
  );
}

function SideColumn({ side, accent }: { side: DivergenceSide; accent: string }) {
  return (
    <div className={`rounded-lg border p-4 ${accent}`}>
      <div className="text-sm font-bold text-gray-900 mb-3">{side.stance}</div>
      <div className="space-y-3">
        {side.specialists.map((s, i) => (
          <div key={`${s.specialist}-${i}`} className="bg-white/70 rounded-md p-3 border border-gray-100">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-800">{s.specialist}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-gray-500">{pct(s.confidence)}</span>
                <EvidenceChip grade={s.evidenceGrade} />
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-snug">{s.reasoning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DivergenceCard({ record }: { record: DivergenceRecord }) {
  const { persisted, resolved } = record;

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm overflow-hidden ${
        persisted ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`px-6 py-4 border-b ${persisted ? 'bg-amber-50' : 'bg-gray-50'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Contested decision</div>
            <h3 className="text-lg font-bold text-gray-900">{record.decisionQuestion}</h3>
            {record.decisionRationale && (
              <p className="text-sm text-gray-600 mt-1">{record.decisionRationale}</p>
            )}
          </div>
          {persisted ? (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
              ⚖️ Genuine equipoise held
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Converged after deliberation
            </span>
          )}
        </div>
        {record.decisionOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {record.decisionOptions.map((opt, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white border border-gray-200 text-gray-700">
                {opt}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Sides */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">The split</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {record.sides.map((side, i) => (
              <SideColumn
                key={i}
                side={side}
                accent={i % 2 === 0 ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'}
              />
            ))}
          </div>
        </div>

        {/* Dialogue round */}
        {record.dialogue.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Deliberation round</h4>
            <div className="space-y-2">
              {record.dialogue.map((d, i) => (
                <div
                  key={`${d.specialist}-${i}`}
                  className={`rounded-md border-l-4 px-4 py-3 ${
                    d.changed ? 'border-orange-400 bg-orange-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800">{d.specialist}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      d.changed ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {d.changed ? 'REVISED' : 'HELD'}
                    </span>
                  </div>
                  {d.changed ? (
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="line-through text-gray-400">{d.originalStance}</span>
                      {' → '}
                      <span className="font-medium text-gray-900">{d.revisedStance}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 mb-1">
                      Held: <span className="font-medium text-gray-900">{d.originalStance}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 leading-snug">
                    {d.changed ? d.changeReason : d.changeReason || d.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outcome banner */}
        <div className={`rounded-lg p-4 ${persisted ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-bold ${persisted ? 'text-amber-800' : 'text-green-800'}`}>
              {persisted
                ? 'Split persisted — irreducible clinical equipoise'
                : resolved
                  ? 'Converged after deliberation'
                  : 'Deliberation complete'}
            </span>
            <span className="text-xs text-gray-500">
              · {record.changedCount} specialist{record.changedCount === 1 ? '' : 's'} revised
            </span>
          </div>
          {record.postDialogue.deltas.length > 0 && (
            <div className="space-y-1">
              {record.postDialogue.deltas.map((delta, i) => (
                <div key={i} className="text-sm text-gray-700">
                  <span className="font-medium">{delta.specialist}</span>:{' '}
                  <span className="text-gray-400 line-through">{delta.from}</span>{' → '}
                  <span className="font-medium">{delta.to}</span>
                  {delta.reason && <span className="text-gray-500"> — {delta.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live-only extras (rendered only when present) */}
        {(record.deferred?.length || record.belowFloor != null) && (
          <div className="text-xs text-gray-500 border-t pt-3 space-y-1">
            {record.belowFloor != null && (
              <div>{record.belowFloor} specialist{record.belowFloor === 1 ? '' : 's'} below the confidence floor</div>
            )}
            {record.deferred && record.deferred.length > 0 && (
              <div>
                Deferred:{' '}
                {record.deferred.map((d) => d.specialist).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
