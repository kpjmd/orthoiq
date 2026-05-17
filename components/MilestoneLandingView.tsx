'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PROMISQuestionnaire from './PROMISQuestionnaire';
import RecoveryArcChart from './RecoveryArcChart';
import { PROMISTimepoint, PROMISCompletionResult } from '@/lib/promisTypes';
import { bodyPartPhrase } from '@/lib/bodyPart';
import type {
  LandingPayload,
  MilestoneStatus,
  PromisResponseRow,
  ReadoutPayload,
} from '@/lib/landing/buildLandingPayload';

interface MilestoneLandingViewProps {
  payload: LandingPayload;
  patientId: string;
  webUserId?: string;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  onComplete?: () => void;
}

type Phase = 'context' | 'questionnaire' | 'submitting' | 'readout' | 'already_done';

const SPECIALIST_LABELS: Record<string, string> = {
  triage: 'Triage',
  painWhisperer: 'Pain',
  movementDetective: 'Movement',
  strengthSage: 'Strength',
  mindMender: 'Mental',
  research: 'Research',
};

function deriveInitialPhase(payload: LandingPayload): Phase {
  if (!payload.currentMilestone || !payload.currentMilestone.due) {
    // No active due milestone — show whatever readouts exist
    return payload.readouts.length > 0 ? 'already_done' : 'context';
  }
  return 'context';
}

function formatNextDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function readoutForTimepoint(
  readouts: ReadoutPayload[],
  timepoint: PROMISTimepoint | null
): ReadoutPayload | null {
  if (!timepoint) return null;
  return readouts.find((r) => r.timepoint === timepoint) || null;
}

export default function MilestoneLandingView({
  payload: initialPayload,
  patientId,
  webUserId,
  headerSlot,
  footerSlot,
  onComplete,
}: MilestoneLandingViewProps) {
  const [payload, setPayload] = useState<LandingPayload>(initialPayload);
  const [phase, setPhase] = useState<Phase>(deriveInitialPhase(initialPayload));
  const [generatedReadout, setGeneratedReadout] = useState<ReadoutPayload | null>(null);
  const [generatingReadout, setGeneratingReadout] = useState(false);

  const { consultation, currentMilestone, targetTimepoint, promisResponses, readouts, isPainRelated, nextMilestoneDate } = payload;
  const weekNumber = currentMilestone ? currentMilestone.day / 7 : null;

  const consultationPhrase =
    consultation.bodyPart && consultation.bodyPart !== 'other'
      ? `your ${consultation.bodyPart} consultation`
      : 'your consultation';

  const recoveryPhrase = `${bodyPartPhrase(consultation.bodyPart)} recovery`;

  const orientingLine =
    phase === 'context' && weekNumber
      ? `Week ${weekNumber} check-in for ${consultationPhrase} on ${consultation.consultationDate}.`
      : `${consultation.daysSince} days since ${consultationPhrase}.`;

  const activeReadout = generatedReadout || readoutForTimepoint(readouts, targetTimepoint);

  async function generateReadout(timepoint: PROMISTimepoint) {
    setGeneratingReadout(true);
    try {
      const res = await fetch('/api/readout/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: consultation.caseId, timepoint }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.readout) {
          setGeneratedReadout(data.readout as ReadoutPayload);
        }
      }
    } catch (e) {
      console.warn('Readout generation failed:', e);
    } finally {
      setGeneratingReadout(false);
    }
  }

  async function refreshPayload() {
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(consultation.caseId)}/landing`);
      if (res.ok) {
        const fresh = (await res.json()) as LandingPayload;
        setPayload(fresh);
      }
    } catch {
      // best-effort
    }
  }

  function handlePromisComplete(result: PROMISCompletionResult, timepoint: PROMISTimepoint) {
    // Optimistically inject the new response so the chart updates immediately.
    const newRow: PromisResponseRow = {
      consultation_id: consultation.caseId,
      timepoint,
      physical_function_t_score: result.scores.physicalFunctionTScore,
      pain_interference_t_score: result.scores.painInterferenceTScore,
      created_at: new Date().toISOString(),
    };
    setPayload((prev) => ({
      ...prev,
      promisResponses: [...prev.promisResponses.filter((r) => r.timepoint !== timepoint), newRow],
      milestones: prev.milestones.map((m): MilestoneStatus =>
        m.timepoint === timepoint ? { ...m, completed: true, due: false } : m,
      ),
    }));
    setPhase('readout');
    generateReadout(timepoint);
    onComplete?.();
  }

  return (
    <div className="space-y-6">
      {headerSlot}

      {/* Orienting line */}
      <p className="text-base text-gray-300 leading-snug">{orientingLine}</p>

      {/* Original question as typographic quote */}
      {consultation.questionText && (
        <blockquote className="border-l-2 border-gray-500 pl-4 italic text-gray-200 text-sm leading-relaxed">
          {consultation.questionText.length > 280
            ? `${consultation.questionText.slice(0, 280).trim()}…`
            : consultation.questionText}
        </blockquote>
      )}

      {/* Recovery arc chart */}
      <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-4">
        <RecoveryArcChart
          responses={promisResponses}
          targetTimepoint={phase === 'context' ? targetTimepoint : null}
          isPainRelated={isPainRelated}
        />
      </div>

      {/* Active block (CTA / form / readout / already done) */}
      <AnimatePresence mode="wait">
        {phase === 'context' && currentMilestone && currentMilestone.due && (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => setPhase('questionnaire')}
              className="w-full py-3.5 bg-gray-100 hover:bg-white text-gray-900 rounded-lg font-medium text-sm transition-colors"
            >
              Start week {weekNumber} check-in
              <span className="ml-2 text-gray-500 font-normal">(about 2 minutes)</span>
            </button>
          </motion.div>
        )}

        {phase === 'context' && currentMilestone && !currentMilestone.due && (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-gray-400"
          >
            Next check-in available in {currentMilestone.day - consultation.daysSince} days.
          </motion.div>
        )}

        {phase === 'questionnaire' && currentMilestone && targetTimepoint && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <PROMISQuestionnaire
              timepoint={targetTimepoint}
              consultationId={consultation.caseId}
              isPainRelated={isPainRelated}
              patientId={patientId}
              webUserId={webUserId}
              skipCompletionScreen
              onComplete={(result) => handlePromisComplete(result, targetTimepoint)}
              onSkip={() => setPhase('context')}
            />
          </motion.div>
        )}

        {phase === 'readout' && (
          <motion.div
            key="readout"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {generatingReadout && !activeReadout && (
              <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="inline-block w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Generating your readout…
                </div>
              </div>
            )}
            {activeReadout && (
              <ReadoutBlock readout={activeReadout} />
            )}
            {nextMilestoneDate && (
              <p className="text-xs text-gray-500">
                Your next check-in is around {formatNextDate(nextMilestoneDate)}.
              </p>
            )}
          </motion.div>
        )}

        {phase === 'already_done' && (
          <motion.div
            key="already"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {readouts.length > 0 && <ReadoutBlock readout={readouts[0]} />}
            {readouts.length > 1 && (
              <details className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                <summary className="text-sm text-gray-400 cursor-pointer">
                  Earlier readouts ({readouts.length - 1})
                </summary>
                <div className="mt-3 space-y-3">
                  {readouts.slice(1).map((r) => (
                    <ReadoutBlock key={r.timepoint + r.generated_at} readout={r} compact />
                  ))}
                </div>
              </details>
            )}
            {nextMilestoneDate && (
              <p className="text-xs text-gray-500">
                Your next check-in is around {formatNextDate(nextMilestoneDate)}.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Specialists, de-emphasized */}
      {consultation.specialists.length > 0 && (
        <div className="text-xs text-gray-500 pt-2">
          <span className="text-gray-400">Specialists involved:</span>{' '}
          {consultation.specialists
            .map((s) => SPECIALIST_LABELS[s] || s)
            .join(', ')}
        </div>
      )}

      {footerSlot}
    </div>
  );
}

function ReadoutBlock({ readout, compact = false }: { readout: ReadoutPayload; compact?: boolean }) {
  const timepointLabel: Record<string, string> = {
    '2week': 'Week 2',
    '4week': 'Week 4',
    '8week': 'Week 8',
  };
  return (
    <div
      className={`bg-gray-800/40 border border-gray-700 rounded-xl ${
        compact ? 'p-3' : 'p-5'
      } space-y-3`}
    >
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {timepointLabel[readout.timepoint] || readout.timepoint} readout
      </div>
      {readout.component1_text && (
        <p className="text-sm text-gray-200 leading-relaxed">{readout.component1_text}</p>
      )}
      {readout.component3_text && (
        <p className="text-sm text-gray-300 leading-relaxed">{readout.component3_text}</p>
      )}
    </div>
  );
}
