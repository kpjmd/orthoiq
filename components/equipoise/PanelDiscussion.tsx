'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EquipoiseCard, EquipoisePanelMember } from '@/lib/types';
import { useClinicianView } from './clinicianView';
import { stanceLabel, stanceRank } from './stance';

interface PanelDiscussionProps {
  card: EquipoiseCard;
}

function confidencePct(conf: number | null): string | null {
  if (typeof conf !== 'number' || Number.isNaN(conf)) return null;
  return `${Math.round(conf * 100)}%`;
}

// Per-decision "full panel discussion" — every lens that took a position
// (incl. deferrals), grouped by stance. Replaces the consult-level responses
// list, which only held the routed specialists who produced a full assessment.
export default function PanelDiscussion({ card }: PanelDiscussionProps) {
  const { clinicianView } = useClinicianView();
  const [open, setOpen] = useState(false);

  const members = card.panel || [];
  if (members.length === 0) return null;

  // Group by stance, then order option A / option B / Deferred.
  const groups = new Map<string, EquipoisePanelMember[]>();
  for (const m of members) {
    const key = m.stance || 'abstain';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const ordered = Array.from(groups.entries()).sort((a, b) => stanceRank(a[0]) - stanceRank(b[0]));

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        {open ? '−' : '+'} Full panel discussion ({members.length})
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-3">
              {ordered.map(([stance, people]) => (
                <div key={stance} className="rounded-lg border border-gray-200 bg-white/70 p-3">
                  <p className="mb-2 text-sm font-semibold text-gray-900">{stanceLabel(card.decision, stance)}</p>
                  <ul className="space-y-2">
                    {people.map((m, i) => (
                      <li key={`${m.specialistType}-${i}`} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-800">{m.name}</span>
                          {clinicianView && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-500">
                              {m.evidenceGrade && m.evidenceGrade !== 'none' && (
                                <span className="rounded bg-gray-100 px-1 font-semibold">Grade {m.evidenceGrade}</span>
                              )}
                              {confidencePct(m.confidence) && <span>{confidencePct(m.confidence)} conf.</span>}
                            </span>
                          )}
                        </div>
                        {m.reasoning && <p className="mt-0.5 text-gray-600">{m.reasoning}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
