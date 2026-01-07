'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type MilestoneType = 'pain' | 'functional' | 'movement';

export interface OutcomeValidationData {
  milestoneDay: number;
  milestoneType: MilestoneType;
  painLevel?: number;
  functionalScore?: number;
  movementQuality?: number;
  returnToActivity?: 'yes' | 'no' | 'partial';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
  rangeOfMotion?: 'limited' | 'improving' | 'normal';
  overallProgress: 'improving' | 'stable' | 'worsening';
  adherence: number;
  completedInterventions: string[];
  newSymptoms: string[];
  concernFlags: string[];
  notes?: string;
}

interface OutcomeValidationFormProps {
  milestoneType: MilestoneType;
  milestoneDay: number;
  consultationId: string;
  patientId: string;
  onSubmit: (data: OutcomeValidationData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const INTERVENTION_OPTIONS = [
  'Ice/Heat therapy',
  'Stretching exercises',
  'Strengthening exercises',
  'Rest/Activity modification',
  'OTC pain medication',
  'Physical therapy',
  'Massage/Foam rolling',
  'Bracing/Taping',
  'Posture correction'
];

const SYMPTOM_OPTIONS = [
  'Increased pain',
  'New pain location',
  'Swelling',
  'Numbness/Tingling',
  'Weakness',
  'Stiffness',
  'Clicking/Popping',
  'Sleep disturbance'
];

const CONCERN_OPTIONS = [
  'Pain not improving',
  'Pain getting worse',
  'Unable to do exercises',
  'Side effects from treatment',
  'Need professional evaluation'
];

export default function OutcomeValidationForm({
  milestoneType,
  milestoneDay,
  consultationId,
  patientId,
  onSubmit,
  onCancel,
  isSubmitting = false
}: OutcomeValidationFormProps) {
  // Common fields
  const [overallProgress, setOverallProgress] = useState<'improving' | 'stable' | 'worsening' | null>(null);
  const [adherence, setAdherence] = useState(80);
  const [completedInterventions, setCompletedInterventions] = useState<string[]>([]);
  const [newSymptoms, setNewSymptoms] = useState<string[]>([]);
  const [concernFlags, setConcernFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Week 2 - Pain fields
  const [painLevel, setPainLevel] = useState(5);

  // Week 4 - Functional fields
  const [returnToActivity, setReturnToActivity] = useState<'yes' | 'no' | 'partial' | null>(null);
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active'>('light');
  const [functionalScore, setFunctionalScore] = useState(50);

  // Week 8 - Movement fields
  const [rangeOfMotion, setRangeOfMotion] = useState<'limited' | 'improving' | 'normal' | null>(null);
  const [movementQuality, setMovementQuality] = useState(5);

  const toggleItem = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const canSubmit = () => {
    if (!overallProgress) return false;
    if (milestoneType === 'functional' && !returnToActivity) return false;
    if (milestoneType === 'movement' && !rangeOfMotion) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    const data: OutcomeValidationData = {
      milestoneDay,
      milestoneType,
      overallProgress: overallProgress!,
      adherence,
      completedInterventions,
      newSymptoms,
      concernFlags,
      notes: notes.trim() || undefined
    };

    // Add type-specific fields
    if (milestoneType === 'pain') {
      data.painLevel = painLevel;
    } else if (milestoneType === 'functional') {
      data.functionalScore = functionalScore;
      data.returnToActivity = returnToActivity!;
      data.activityLevel = activityLevel;
    } else if (milestoneType === 'movement') {
      data.movementQuality = movementQuality;
      data.rangeOfMotion = rangeOfMotion!;
    }

    await onSubmit(data);
  };

  const getMilestoneTitle = () => {
    switch (milestoneType) {
      case 'pain':
        return 'Week 2 - Pain Level Check-in';
      case 'functional':
        return 'Week 4 - Functional Status Check-in';
      case 'movement':
        return 'Week 8 - Movement & Final Outcome';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <h3 className="text-xl font-bold text-white mb-6">{getMilestoneTitle()}</h3>

      <div className="space-y-6">
        {/* Type-specific fields */}
        {milestoneType === 'pain' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Current Pain Level (0 = No Pain, 10 = Worst Pain)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className={`text-2xl font-bold min-w-[3ch] text-center ${
                painLevel <= 3 ? 'text-green-400' :
                painLevel <= 6 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {painLevel}
              </span>
            </div>
          </div>
        )}

        {milestoneType === 'functional' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Have you returned to your normal activities?
              </label>
              <div className="flex gap-3">
                {(['yes', 'partial', 'no'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setReturnToActivity(option)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      returnToActivity === option
                        ? option === 'yes' ? 'bg-green-600 text-white' :
                          option === 'partial' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {option === 'yes' ? 'Yes' : option === 'partial' ? 'Partially' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Current Activity Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['sedentary', 'light', 'moderate', 'active'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setActivityLevel(level)}
                    className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                      activityLevel === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Functional Score (0 = Unable to function, 100 = Fully functional)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={functionalScore}
                  onChange={(e) => setFunctionalScore(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className={`text-2xl font-bold min-w-[4ch] text-center ${
                  functionalScore >= 70 ? 'text-green-400' :
                  functionalScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {functionalScore}%
                </span>
              </div>
            </div>
          </>
        )}

        {milestoneType === 'movement' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Range of Motion Assessment
              </label>
              <div className="flex gap-3">
                {(['limited', 'improving', 'normal'] as const).map(option => (
                  <button
                    key={option}
                    onClick={() => setRangeOfMotion(option)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      rangeOfMotion === option
                        ? option === 'normal' ? 'bg-green-600 text-white' :
                          option === 'improving' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Movement Quality Rating (1 = Poor, 10 = Excellent)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={movementQuality}
                  onChange={(e) => setMovementQuality(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className={`text-2xl font-bold min-w-[3ch] text-center ${
                  movementQuality >= 7 ? 'text-green-400' :
                  movementQuality >= 4 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {movementQuality}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Overall Progress - Common field */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Overall Progress
          </label>
          <div className="flex gap-3">
            {(['improving', 'stable', 'worsening'] as const).map(option => (
              <button
                key={option}
                onClick={() => setOverallProgress(option)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  overallProgress === option
                    ? option === 'improving' ? 'bg-green-600 text-white' :
                      option === 'stable' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Adherence slider */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Treatment Adherence - How well did you follow the recommendations?
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={adherence}
              onChange={(e) => setAdherence(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className={`text-2xl font-bold min-w-[4ch] text-center ${
              adherence >= 80 ? 'text-green-400' :
              adherence >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {adherence}%
            </span>
          </div>
        </div>

        {/* Completed Interventions */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            What interventions did you complete? (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {INTERVENTION_OPTIONS.map(intervention => (
              <button
                key={intervention}
                onClick={() => toggleItem(intervention, completedInterventions, setCompletedInterventions)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  completedInterventions.includes(intervention)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {intervention}
              </button>
            ))}
          </div>
        </div>

        {/* New Symptoms */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Any new symptoms? (Select if applicable)
          </label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map(symptom => (
              <button
                key={symptom}
                onClick={() => toggleItem(symptom, newSymptoms, setNewSymptoms)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  newSymptoms.includes(symptom)
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>

        {/* Concern Flags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Any concerns? (Select if applicable)
          </label>
          <div className="flex flex-wrap gap-2">
            {CONCERN_OPTIONS.map(concern => (
              <button
                key={concern}
                onClick={() => toggleItem(concern, concernFlags, setConcernFlags)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  concernFlags.includes(concern)
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {concern}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Additional Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information about your recovery..."
            className="w-full h-24 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 py-3 px-6 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              canSubmit() && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Validation'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
