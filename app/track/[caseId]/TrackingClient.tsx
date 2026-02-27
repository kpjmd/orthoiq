'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OutcomeValidationForm, { OutcomeValidationData, MilestoneType } from '@/components/OutcomeValidationForm';
import PROMISQuestionnaire from '@/components/PROMISQuestionnaire';
import { isPainRelatedConsultation } from '@/lib/promis';
import { PROMISCompletionResult, PROMISDelta } from '@/lib/types';

interface MilestoneStatus {
  day: number;
  type: 'pain' | 'functional' | 'movement';
  label: string;
  completed: boolean;
  due: boolean;
  data: any | null;
}

interface TrackingClientProps {
  caseId: string;
  fid: string;
  isPrivate: boolean;
  consultationDate: string;
  daysSince: number;
  specialists: string[];
  specialistCount: number;
  coordinationSummary: string | null;
  milestoneStatus: MilestoneStatus[];
  currentMilestone: MilestoneStatus | null;
  completedCount: number;
  totalMilestones: number;
}

const SPECIALIST_COLORS: Record<string, string> = {
  triage: '#3b82f6',
  painWhisperer: '#8b5cf6',
  movementDetective: '#10b981',
  strengthSage: '#f59e0b',
  mindMender: '#ef4444'
};

const SPECIALIST_DISPLAY_NAMES: Record<string, string> = {
  triage: 'Triage',
  painWhisperer: 'Pain',
  movementDetective: 'Movement',
  strengthSage: 'Strength',
  mindMender: 'Mental'
};

export default function TrackingClient({
  caseId,
  fid,
  isPrivate: initialIsPrivate,
  consultationDate,
  daysSince,
  specialists,
  specialistCount,
  coordinationSummary,
  milestoneStatus: initialMilestoneStatus,
  currentMilestone: initialCurrentMilestone,
  completedCount: initialCompletedCount,
  totalMilestones
}: TrackingClientProps) {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationForm, setShowValidationForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [milestoneStatus, setMilestoneStatus] = useState(initialMilestoneStatus);
  const [currentMilestone, setCurrentMilestone] = useState(initialCurrentMilestone);
  const [completedCount, setCompletedCount] = useState(initialCompletedCount);

  // PROMIS state for follow-up milestones
  const [showPromisForm, setShowPromisForm] = useState(false);
  const [promisCompleted, setPromisCompleted] = useState(false);
  const [promisDelta, setPromisDelta] = useState<PROMISDelta | null>(null);
  const [hasPromisBaseline, setHasPromisBaseline] = useState(false);

  // Check if a PROMIS baseline exists for this consultation
  useEffect(() => {
    const checkBaseline = async () => {
      try {
        const res = await fetch(`/api/feedback/promis?consultationId=${caseId}`);
        if (res.ok) {
          const data = await res.json();
          setHasPromisBaseline(data.responses?.some((r: any) => r.timepoint === 'baseline') || false);
        }
      } catch {
        // Baseline check is best-effort
      }
    };
    checkBaseline();
  }, [caseId]);

  const handlePrivacyToggle = async () => {
    try {
      const response = await fetch(`/api/consultations/${caseId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, isPrivate: !isPrivate })
      });

      if (response.ok) {
        setIsPrivate(!isPrivate);
      } else {
        const error = await response.json();
        console.error('Failed to update privacy:', error);
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
    }
  };

  const handleValidationSubmit = async (data: OutcomeValidationData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/predictions/resolve/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: caseId,
          followUpData: {
            painLevel: data.painLevel,
            functionalScore: data.functionalScore,
            movementQuality: data.movementQuality,
            adherence: data.adherence / 100, // Convert to 0-1 scale
            completedInterventions: data.completedInterventions,
            newSymptoms: data.newSymptoms,
            concernFlags: data.concernFlags,
            overallProgress: data.overallProgress,
            returnToActivity: data.returnToActivity,
            activityLevel: data.activityLevel,
            rangeOfMotion: data.rangeOfMotion,
            notes: data.notes
          },
          milestoneDay: data.milestoneDay,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
        setSubmitSuccess(true);
        setShowValidationForm(false);

        // Update milestone status
        const updatedMilestones = milestoneStatus.map(ms => {
          if (ms.day === data.milestoneDay) {
            return { ...ms, completed: true, data: result };
          }
          return ms;
        });
        setMilestoneStatus(updatedMilestones);
        setCompletedCount(prev => prev + 1);

        // Find next milestone
        const nextMilestone = updatedMilestones.find(ms => !ms.completed);
        setCurrentMilestone(nextMilestone || null);
      } else {
        const error = await response.json();
        setSubmitError(error.error || 'Failed to submit validation');
      }
    } catch (error) {
      console.error('Error submitting validation:', error);
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case 'improving':
        return 'text-green-400';
      case 'stable':
        return 'text-blue-400';
      case 'worsening':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Case #{caseId}</h1>
            <button
              onClick={handlePrivacyToggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isPrivate
                  ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40'
                  : 'bg-green-600/20 text-green-400 border border-green-600/40'
              }`}
            >
              {isPrivate ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Private
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Public
                </>
              )}
            </button>
          </div>
          <p className="text-gray-400">Consultation: {consultationDate}</p>
          <p className="text-gray-400">{daysSince} days since consultation</p>
        </div>

        {/* Specialists involved */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Specialists Involved ({specialistCount})</h3>
          <div className="flex flex-wrap gap-2">
            {specialists.map((specialist, idx) => {
              const color = SPECIALIST_COLORS[specialist] || '#6b7280';
              const displayName = SPECIALIST_DISPLAY_NAMES[specialist] || specialist;
              return (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                    border: `1px solid ${color}40`
                  }}
                >
                  {displayName}
                </span>
              );
            })}
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Recovery Timeline</h3>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm font-medium">{completedCount}/{totalMilestones} milestones</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-6">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 to-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalMilestones) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="space-y-4">
            {milestoneStatus.map((milestone, idx) => (
              <div
                key={milestone.day}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  milestone.completed
                    ? 'bg-green-900/20 border border-green-700/40'
                    : milestone.due
                    ? 'bg-blue-900/20 border border-blue-600/40'
                    : 'bg-gray-700/30 border border-gray-600/40'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    milestone.completed
                      ? 'bg-green-600'
                      : milestone.due
                      ? 'bg-blue-600'
                      : 'bg-gray-600'
                  }`}
                >
                  {milestone.completed ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{milestone.label}</div>
                  <div className="text-sm text-gray-400">
                    Day {milestone.day}
                    {milestone.completed && milestone.data?.overall_progress && (
                      <span className={`ml-2 ${getProgressColor(milestone.data.overall_progress)}`}>
                        ({milestone.data.overall_progress})
                      </span>
                    )}
                  </div>
                </div>
                {milestone.completed && (
                  <span className="text-green-400 text-sm font-medium">Completed</span>
                )}
                {milestone.due && !milestone.completed && (
                  <span className="text-blue-400 text-sm font-medium animate-pulse">Due now</span>
                )}
                {!milestone.due && !milestone.completed && (
                  <span className="text-gray-500 text-sm">
                    in {milestone.day - daysSince} days
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Milestone Action */}
        <AnimatePresence mode="wait">
          {submitSuccess && validationResult ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-900/30 border border-green-600/50 rounded-xl p-6 mb-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-400">Validation Submitted!</h3>
                  <p className="text-gray-400 text-sm">{validationResult.message}</p>
                </div>
              </div>

              {validationResult.validationResults?.predictionsValidated?.length > 0 && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Predictions Validated</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {validationResult.validationResults.predictionsValidated.map((pred: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {pred}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* PROMIS delta display after follow-up */}
              {promisDelta && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">PROMIS Score Changes</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Physical Function</span>
                      <span className={promisDelta.physicalFunction >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {promisDelta.physicalFunction >= 0 ? '+' : ''}{promisDelta.physicalFunction} pts
                        {Math.abs(promisDelta.physicalFunction) >= 5 && ' (clinically meaningful)'}
                      </span>
                    </div>
                    {promisDelta.painInterference != null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Pain Interference</span>
                        <span className={promisDelta.painInterference >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {promisDelta.painInterference >= 0 ? '+' : ''}{promisDelta.painInterference} pts improvement
                          {Math.abs(promisDelta.painInterference) >= 5 && ' (clinically meaningful)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentMilestone && (
                <div className="mt-4 text-sm text-gray-400">
                  Next milestone: {currentMilestone.label} (Day {currentMilestone.day})
                </div>
              )}

              <button
                onClick={() => setSubmitSuccess(false)}
                className="mt-4 w-full py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          ) : showPromisForm && currentMilestone && hasPromisBaseline ? (
            <motion.div
              key="promis-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <PROMISQuestionnaire
                timepoint={
                  currentMilestone.day <= 14 ? '2week' :
                  currentMilestone.day <= 28 ? '4week' : '8week'
                }
                consultationId={caseId}
                isPainRelated={true}
                patientId={fid}
                onComplete={(result) => {
                  setPromisCompleted(true);
                  setPromisDelta(result.delta || null);
                  setShowPromisForm(false);
                  // Mark milestone as completed
                  const updatedMilestones = milestoneStatus.map(ms => {
                    if (ms.day === currentMilestone.day) {
                      return { ...ms, completed: true, data: { overall_progress: 'promis_complete', promis: result } };
                    }
                    return ms;
                  });
                  setMilestoneStatus(updatedMilestones);
                  setCompletedCount(prev => prev + 1);
                  const nextMilestone = updatedMilestones.find(ms => !ms.completed);
                  setCurrentMilestone(nextMilestone || null);
                  setSubmitSuccess(true);
                  setValidationResult({
                    message: 'PROMIS follow-up questionnaire completed.',
                    validationResults: { predictionsValidated: [] },
                  });
                }}
                onSkip={() => {
                  setShowPromisForm(false);
                  setShowValidationForm(true);
                }}
              />
            </motion.div>
          ) : showValidationForm && currentMilestone ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <OutcomeValidationForm
                milestoneType={currentMilestone.type as MilestoneType}
                milestoneDay={currentMilestone.day}
                consultationId={caseId}
                patientId={fid}
                onSubmit={handleValidationSubmit}
                onCancel={() => setShowValidationForm(false)}
                isSubmitting={isSubmitting}
              />
              {submitError && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-600/50 rounded-lg text-red-400">
                  {submitError}
                </div>
              )}
            </motion.div>
          ) : currentMilestone ? (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-blue-900/30 border border-blue-600/50 rounded-xl p-6 mb-6"
            >
              <h3 className="text-lg font-semibold mb-2">
                {currentMilestone.due ? 'Time for your check-in!' : 'Upcoming Check-in'}
              </h3>
              <p className="text-gray-400 mb-4">
                {currentMilestone.due
                  ? `Your ${currentMilestone.label} validation is ready. Share how you're doing to validate agent predictions.`
                  : `Your ${currentMilestone.label} check-in will be available in ${currentMilestone.day - daysSince} days.`}
              </p>
              <button
                onClick={() => hasPromisBaseline ? setShowPromisForm(true) : setShowValidationForm(true)}
                disabled={!currentMilestone.due}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  currentMilestone.due
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {currentMilestone.due ? 'Start Check-in' : 'Not Available Yet'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-900/30 border border-green-600/50 rounded-xl p-6 mb-6 text-center"
            >
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-green-400 mb-2">All Milestones Complete!</h3>
              <p className="text-gray-400">
                Thank you for tracking your recovery. Your outcome data helps improve predictions for future patients.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coordination Summary */}
        {coordinationSummary && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3">Original Recommendations</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{coordinationSummary}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>OrthoIQ - AI-Powered Orthopedic Intelligence</p>
          <p className="mt-1">Track your recovery, validate predictions</p>
        </div>
      </div>
    </div>
  );
}
