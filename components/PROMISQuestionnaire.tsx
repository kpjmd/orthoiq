'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PHYSICAL_FUNCTION_QUESTIONS,
  PAIN_INTERFERENCE_QUESTIONS,
  computeScores,
  getPhysicalFunctionBand,
  getPainInterferenceBand,
} from '@/lib/promis';
import { PROMISTimepoint, PROMISScores, PROMISCompletionResult, PROMISDelta } from '@/lib/types';

interface PROMISQuestionnaireProps {
  timepoint: PROMISTimepoint;
  consultationId: string;
  isPainRelated: boolean;
  patientId: string;
  onComplete: (result: PROMISCompletionResult) => void;
  onSkip: () => void;
}

type Phase = 'physicalFunction' | 'painPrompt' | 'painInterference' | 'submitting' | 'complete';

export default function PROMISQuestionnaire({
  timepoint,
  consultationId,
  isPainRelated,
  patientId,
  onComplete,
  onSkip,
}: PROMISQuestionnaireProps) {
  const [phase, setPhase] = useState<Phase>('physicalFunction');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pfResponses, setPfResponses] = useState<Record<string, number>>({});
  const [piResponses, setPiResponses] = useState<Record<string, number>>({});
  const [completionResult, setCompletionResult] = useState<PROMISCompletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentQuestions = phase === 'painInterference'
    ? PAIN_INTERFERENCE_QUESTIONS
    : PHYSICAL_FUNCTION_QUESTIONS;
  const currentResponses = phase === 'painInterference' ? piResponses : pfResponses;
  const currentQuestion = currentQuestions[currentIndex];

  const selectedValue = currentQuestion ? currentResponses[currentQuestion.id] : undefined;

  const handleSelect = useCallback((value: number) => {
    if (!currentQuestion) return;
    if (phase === 'painInterference') {
      setPiResponses(prev => ({ ...prev, [currentQuestion.id]: value }));
    } else {
      setPfResponses(prev => ({ ...prev, [currentQuestion.id]: value }));
    }
  }, [currentQuestion, phase]);

  const submitResponses = useCallback(async (
    pf: Record<string, number>,
    pi: Record<string, number> | null
  ) => {
    setPhase('submitting');
    setError(null);

    try {
      const res = await fetch('/api/feedback/promis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          patientId,
          timepoint,
          physicalFunctionResponses: pf,
          painInterferenceResponses: pi,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit responses');
      }

      const scores: PROMISScores = {
        physicalFunctionRawScore: data.scores.physicalFunction.rawScore,
        physicalFunctionTScore: data.scores.physicalFunction.tScore,
        painInterferenceRawScore: data.scores.painInterference?.rawScore ?? null,
        painInterferenceTScore: data.scores.painInterference?.tScore ?? null,
      };

      const result: PROMISCompletionResult = {
        scores,
        delta: data.delta ?? undefined,
      };

      setCompletionResult(result);
      setPhase('complete');
      onComplete(result);
    } catch (err) {
      console.error('PROMIS submission error:', err);
      setError(err instanceof Error ? err.message : 'Submission failed');
      // Go back to last question of whichever phase was active
      if (pi) {
        setPhase('painInterference');
        setCurrentIndex(PAIN_INTERFERENCE_QUESTIONS.length - 1);
      } else {
        setPhase('physicalFunction');
        setCurrentIndex(PHYSICAL_FUNCTION_QUESTIONS.length - 1);
      }
    }
  }, [consultationId, patientId, timepoint, onComplete]);

  const handleNext = useCallback(() => {
    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (phase === 'physicalFunction') {
      // Physical Function complete — check if should prompt for Pain Interference
      if (isPainRelated) {
        setPhase('painPrompt');
      } else {
        submitResponses(pfResponses, null);
      }
    } else if (phase === 'painInterference') {
      submitResponses(pfResponses, piResponses);
    }
  }, [currentIndex, currentQuestions.length, phase, isPainRelated, pfResponses, piResponses, submitResponses]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handlePainAccept = () => {
    setPhase('painInterference');
    setCurrentIndex(0);
  };

  const handlePainDecline = () => {
    submitResponses(pfResponses, null);
  };

  // ── Submitting state ──
  if (phase === 'submitting') {
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-600">Saving your responses...</p>
      </div>
    );
  }

  // ── Completion summary ──
  if (phase === 'complete' && completionResult) {
    const pfBand = getPhysicalFunctionBand(completionResult.scores.physicalFunctionTScore);
    const piBand = completionResult.scores.painInterferenceTScore != null
      ? getPainInterferenceBand(completionResult.scores.painInterferenceTScore)
      : null;
    const delta = completionResult.delta;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-green-200 p-6"
      >
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="text-lg font-bold text-gray-900">
            {timepoint === 'baseline' ? 'Baseline Recorded' : 'Progress Check Complete'}
          </h3>
        </div>

        <div className="space-y-3 mb-4">
          {/* Physical Function */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Physical Function</span>
              <span className="text-sm font-bold" style={{ color: pfBand.color }}>
                T-Score: {completionResult.scores.physicalFunctionTScore}
              </span>
            </div>
            <p className="text-xs" style={{ color: pfBand.color }}>{pfBand.label} — {pfBand.description}</p>
            {delta && (
              <p className={`text-xs mt-1 font-medium ${delta.physicalFunction >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {delta.physicalFunction >= 0 ? '+' : ''}{delta.physicalFunction} points from baseline
                {Math.abs(delta.physicalFunction) >= 5 && ' (clinically meaningful)'}
              </p>
            )}
          </div>

          {/* Pain Interference */}
          {piBand && completionResult.scores.painInterferenceTScore != null && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Pain Interference</span>
                <span className="text-sm font-bold" style={{ color: piBand.color }}>
                  T-Score: {completionResult.scores.painInterferenceTScore}
                </span>
              </div>
              <p className="text-xs" style={{ color: piBand.color }}>{piBand.label} — {piBand.description}</p>
              {delta?.painInterference != null && (
                <p className={`text-xs mt-1 font-medium ${delta.painInterference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {delta.painInterference >= 0 ? '+' : ''}{delta.painInterference} points improvement
                  {Math.abs(delta.painInterference) >= 5 && ' (clinically meaningful)'}
                </p>
              )}
            </div>
          )}
        </div>

        {timepoint === 'baseline' && (
          <p className="text-xs text-gray-500 text-center">
            Your scores have been saved. We&apos;ll check in at 2 weeks, 4 weeks, and 8 weeks to track your progress.
          </p>
        )}
      </motion.div>
    );
  }

  // ── Pain Interference prompt ──
  if (phase === 'painPrompt') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-blue-200 p-6"
      >
        <div className="text-center mb-4">
          <div className="text-2xl mb-2">🎯</div>
          <h3 className="text-base font-bold text-gray-900">Track Pain Recovery</h3>
        </div>
        <p className="text-sm text-gray-700 mb-4 text-center">
          You mentioned pain in your consultation. 6 more questions will help track your pain recovery over time — takes about 1 minute.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handlePainDecline}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            No thanks
          </button>
          <button
            onClick={handlePainAccept}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Question view ──
  const totalQuestions = currentQuestions.length;
  const sectionLabel = phase === 'painInterference' ? 'Pain Tracking' : 'Physical Function';

  return (
    <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
      {/* Progress header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-blue-700 uppercase">{sectionLabel}</span>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={false}
            animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question body */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${phase}-${currentIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Stem + Question text */}
            <p className="text-xs text-gray-500 mb-1">{currentQuestion.stem}</p>
            <p className="text-sm font-medium text-gray-900 mb-4">{currentQuestion.text}</p>

            {/* Options */}
            <div className="space-y-2">
              {currentQuestion.scaleLabels.map((label, idx) => {
                const value = idx + 1;
                const isSelected = selectedValue === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-medium'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-2 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {value}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 mt-4">
          {currentIndex > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={selectedValue === undefined}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              selectedValue !== undefined
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {currentIndex === currentQuestions.length - 1
              ? (phase === 'physicalFunction' && isPainRelated ? 'Continue' : 'Submit')
              : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
