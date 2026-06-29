'use client';

import { EquipoiseCard, EquipoiseCarePlanHome, EquipoiseDecision } from '@/lib/types';

// Pull ordered phase strings (phase1, phase2, …) then any other string fields.
export function planLines(plan: EquipoiseCarePlanHome): { label: string; text: string }[] {
  const lines: { label: string; text: string }[] = [];
  const phaseKeys = Object.keys(plan)
    .filter(k => /^phase\d+$/i.test(k))
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));
  for (const k of phaseKeys) {
    const v = plan[k];
    if (typeof v === 'string' && v.trim()) lines.push({ label: k.replace(/phase/i, 'Phase '), text: v });
  }
  for (const k of Object.keys(plan)) {
    if (/^phase\d+$/i.test(k)) continue;
    const v = plan[k];
    if (typeof v === 'string' && v.trim()) lines.push({ label: k.replace(/_/g, ' '), text: v });
  }
  return lines;
}

function hasPlan(plan: EquipoiseCarePlanHome | null | undefined): plan is EquipoiseCarePlanHome {
  return !!plan && planLines(plan).length > 0;
}

export interface CarePlanGroup {
  id: string;
  plan: EquipoiseCarePlanHome;
  decisions: EquipoiseDecision[];
}

// One care plan per DISTINCT carePlanHome — cards that share an identical plan
// collapse into the same group (prevents duplication). Returns the ordered
// groups plus a card→anchor resolver so each card can reference its plan.
export function buildCarePlanGroups(cards: EquipoiseCard[]): {
  groups: CarePlanGroup[];
  anchorForCard: (card: EquipoiseCard) => string | null;
} {
  const byKey = new Map<string, CarePlanGroup>();
  const order: string[] = [];
  for (const c of cards) {
    if (!hasPlan(c.carePlanHome)) continue;
    const key = JSON.stringify(c.carePlanHome);
    if (!byKey.has(key)) {
      byKey.set(key, { id: `equipoise-careplan-${order.length}`, plan: c.carePlanHome, decisions: [] });
      order.push(key);
    }
    byKey.get(key)!.decisions.push(c.decision);
  }
  const groups = order.map(k => byKey.get(k)!);
  const anchorForCard = (card: EquipoiseCard): string | null => {
    if (!hasPlan(card.carePlanHome)) return null;
    return byKey.get(JSON.stringify(card.carePlanHome))?.id ?? null;
  };
  return { groups, anchorForCard };
}

export default function CarePlanSection({ groups }: { groups: CarePlanGroup[] }) {
  if (!groups || groups.length === 0) return null;
  const multi = groups.length > 1;

  return (
    <div id="equipoise-care-plan" className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🩹</span>
        <h3 className="text-base font-semibold text-gray-900">{multi ? 'Care plans' : 'Care plan'}</h3>
      </div>
      <div className="space-y-4">
        {groups.map(group => (
          <div key={group.id} id={group.id} className={multi ? 'border-l-2 border-gray-200 pl-3' : ''}>
            {multi && (
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                {group.decisions[0]?.optionA} vs {group.decisions[0]?.optionB}
                {group.decisions.length > 1 ? ` (+${group.decisions.length - 1} more)` : ''}
              </p>
            )}
            <ol className="space-y-1">
              {planLines(group.plan).map((l, i) => (
                <li key={i} className="text-sm text-gray-700">
                  <span className="font-medium capitalize text-gray-900">{l.label}:</span> {l.text}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
