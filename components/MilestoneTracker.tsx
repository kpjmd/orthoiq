'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Milestone {
  day: number;
  achieved: boolean;
  painLevel?: number;
  functionalScore?: number;
  adherence?: number;
  progressStatus?: 'on_track' | 'needs_attention' | 'concerning';
  tokenReward?: number;
  encouragement?: string;
}

interface MilestoneTrackerProps {
  consultationId: string;
  patientId: string;
  consultationDate: string;
  onMilestoneSubmit?: (milestoneData: any) => void;
}

const MILESTONE_DAYS = [3, 7, 14, 21, 30];

export default function MilestoneTracker({
  consultationId,
  patientId,
  consultationDate,
  onMilestoneSubmit
}: MilestoneTrackerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for active milestone
  const [painLevel, setPainLevel] = useState(5);
  const [functionalScore, setFunctionalScore] = useState(5);
  const [adherence, setAdherence] = useState(75);
  const [completedInterventions, setCompletedInterventions] = useState<string[]>([]);
  const [newSymptoms, setNewSymptoms] = useState('');
  const [concernFlags, setConcernFlags] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState<'improving' | 'stable' | 'worsening'>('improving');

  const loadMilestones = useCallback(async () => {
    try {
      const response = await fetch(`/api/milestones?consultationId=${consultationId}`);
      if (response.ok) {
        const data = await response.json();
        setMilestones(data);
      }
    } catch (error) {
      console.error('Failed to load milestones:', error);
    }
  }, [consultationId]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const getDaysSinceConsultation = () => {
    const consultDate = new Date(consultationDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - consultDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getNextMilestone = () => {
    const daysSince = getDaysSinceConsultation();
    const completedDays = milestones.filter(m => m.achieved).map(m => m.day);
    return MILESTONE_DAYS.find(day => day >= daysSince && !completedDays.includes(day));
  };

  const getMilestoneStatus = (day: number) => {
    const daysSince = getDaysSinceConsultation();
    const milestone = milestones.find(m => m.day === day);

    if (milestone?.achieved) return 'completed';
    if (day > daysSince) return 'upcoming';
    if (day <= daysSince && day < daysSince + 2) return 'active';
    return 'overdue';
  };

  const handleSubmitMilestone = async () => {
    if (activeMilestone === null) return;

    setIsSubmitting(true);

    try {
      const milestoneData = {
        consultationId,
        patientId,
        milestoneDay: activeMilestone,
        progressData: {
          painLevel,
          functionalScore,
          adherence,
          completedInterventions,
          newSymptoms: newSymptoms.split(',').map(s => s.trim()).filter(Boolean),
          concernFlags
        },
        patientReportedOutcome: {
          overallProgress,
          satisfactionSoFar: functionalScore,
          difficultiesEncountered: concernFlags
        }
      };

      const response = await fetch('/api/feedback/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneData)
      });

      if (response.ok) {
        const result = await response.json();
        onMilestoneSubmit?.(result);
        await loadMilestones();
        setActiveMilestone(null);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to submit milestone:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPainLevel(5);
    setFunctionalScore(5);
    setAdherence(75);
    setCompletedInterventions([]);
    setNewSymptoms('');
    setConcernFlags([]);
    setOverallProgress('improving');
  };

  const nextMilestone = getNextMilestone();
  const daysSince = getDaysSinceConsultation();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-3xl"
          >
            📊
          </motion.span>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Recovery Progress Tracker</h3>
            <p className="text-sm text-gray-600">Track your healing journey</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Days since consultation</p>
          <p className="text-2xl font-bold text-indigo-600">{daysSince}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {MILESTONE_DAYS.map((day, index) => {
            const status = getMilestoneStatus(day);
            const milestone = milestones.find(m => m.day === day);

            return (
              <div key={day} className="flex-1 relative">
                {/* Connection Line */}
                {index < MILESTONE_DAYS.length - 1 && (
                  <div
                    className={`absolute top-6 left-1/2 w-full h-1 ${
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}

                {/* Milestone Node */}
                <div className="relative z-10 flex flex-col items-center">
                  <motion.button
                    onClick={() => status === 'active' && setActiveMilestone(day)}
                    whileHover={status === 'active' ? { scale: 1.1 } : {}}
                    className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold ${
                      status === 'completed'
                        ? 'bg-green-500 border-green-600 text-white'
                        : status === 'active'
                        ? 'bg-yellow-400 border-yellow-500 text-yellow-900 animate-pulse cursor-pointer'
                        : status === 'overdue'
                        ? 'bg-red-100 border-red-400 text-red-700'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}
                  >
                    {status === 'completed' ? '✓' : day}
                  </motion.button>

                  <p className="text-xs text-gray-600 mt-2 font-medium">Day {day}</p>

                  {milestone?.tokenReward && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full"
                    >
                      +{milestone.tokenReward} tokens
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Milestone Alert */}
      {nextMilestone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-semibold text-blue-900">
                Next Milestone: Day {nextMilestone}
              </p>
              <p className="text-sm text-blue-700">
                {nextMilestone - daysSince > 0
                  ? `Coming up in ${nextMilestone - daysSince} day${nextMilestone - daysSince !== 1 ? 's' : ''}`
                  : 'Available to complete now!'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Milestone Progress Form */}
      <AnimatePresence>
        {activeMilestone !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 pt-6 space-y-6"
          >
            <h4 className="text-lg font-bold text-gray-900">Day {activeMilestone} Progress Check</h4>

            {/* Pain Level */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Pain Level (0 = No pain, 10 = Worst pain)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className={`text-2xl font-bold w-12 text-center ${
                  painLevel <= 3 ? 'text-green-600' : painLevel <= 6 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {painLevel}
                </span>
              </div>
            </div>

            {/* Functional Score */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Functional Ability (0 = Can&apos;t move, 10 = Normal function)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={functionalScore}
                  onChange={(e) => setFunctionalScore(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className={`text-2xl font-bold w-12 text-center ${
                  functionalScore >= 7 ? 'text-green-600' : functionalScore >= 4 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {functionalScore}
                </span>
              </div>
            </div>

            {/* Adherence */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Treatment Adherence (% of exercises/recommendations followed)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={adherence}
                  onChange={(e) => setAdherence(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xl font-bold w-16 text-center text-indigo-600">
                  {adherence}%
                </span>
              </div>
            </div>

            {/* Overall Progress */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Overall Progress
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setOverallProgress('improving')}
                  className={`py-3 px-4 rounded-lg border-2 transition-all ${
                    overallProgress === 'improving'
                      ? 'bg-green-100 border-green-500 text-green-800'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                  }`}
                  type="button"
                >
                  📈 Improving
                </button>
                <button
                  onClick={() => setOverallProgress('stable')}
                  className={`py-3 px-4 rounded-lg border-2 transition-all ${
                    overallProgress === 'stable'
                      ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-400'
                  }`}
                  type="button"
                >
                  ➡️ Stable
                </button>
                <button
                  onClick={() => setOverallProgress('worsening')}
                  className={`py-3 px-4 rounded-lg border-2 transition-all ${
                    overallProgress === 'worsening'
                      ? 'bg-red-100 border-red-500 text-red-800'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                  }`}
                  type="button"
                >
                  📉 Worsening
                </button>
              </div>
            </div>

            {/* New Symptoms */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Symptoms (optional, comma-separated)
              </label>
              <input
                type="text"
                value={newSymptoms}
                onChange={(e) => setNewSymptoms(e.target.value)}
                placeholder="e.g., swelling, numbness, stiffness"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Concern Flags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Any Concerns? (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Pain increasing',
                  'Limited mobility',
                  'Swelling',
                  'Difficulty sleeping',
                  'Side effects',
                  'Confusion about exercises'
                ].map((concern) => (
                  <button
                    key={concern}
                    onClick={() =>
                      setConcernFlags((prev) =>
                        prev.includes(concern)
                          ? prev.filter((c) => c !== concern)
                          : [...prev, concern]
                      )
                    }
                    className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-all ${
                      concernFlags.includes(concern)
                        ? 'bg-red-100 border-red-500 text-red-800'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-red-300'
                    }`}
                    type="button"
                  >
                    {concernFlags.includes(concern) ? '✓ ' : ''}
                    {concern}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSubmitMilestone}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  '🎯 Submit Progress Update'
                )}
              </button>
              <button
                onClick={() => {
                  setActiveMilestone(null);
                  resetForm();
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed Milestones Summary */}
      {milestones.filter(m => m.achieved).length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 pt-6 border-t border-gray-200"
        >
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Completed Milestones</h4>
          <div className="space-y-2">
            {milestones
              .filter(m => m.achieved)
              .map((milestone) => (
                <div
                  key={milestone.day}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-green-600 font-bold">Day {milestone.day}</span>
                    {milestone.progressStatus && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          milestone.progressStatus === 'on_track'
                            ? 'bg-green-200 text-green-800'
                            : milestone.progressStatus === 'needs_attention'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {milestone.progressStatus.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {milestone.tokenReward && (
                    <span className="text-sm font-semibold text-yellow-700">
                      +{milestone.tokenReward} tokens earned
                    </span>
                  )}
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
