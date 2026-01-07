'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  patientId: string;
  mode: 'fast' | 'normal';
  hasSpecialistConsultation?: boolean;
  specialists?: Array<{
    name: string;
    type: string;
    specialty: string;
  }>;
  onFeedbackSubmitted?: (tokenRewards: any[]) => void;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  consultationId,
  patientId,
  mode,
  hasSpecialistConsultation = false,
  specialists = [],
  onFeedbackSubmitted
}: FeedbackModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Overall satisfaction
  const [overallRating, setOverallRating] = useState(0);
  const [outcomeSuccess, setOutcomeSuccess] = useState<boolean | null>(null);

  // Step 2: Specialist ratings (only for comprehensive mode)
  const [specialistRatings, setSpecialistRatings] = useState<Record<string, number>>({});

  // Step 3: Valuable aspects and missing info
  const [valuableAspects, setValuableAspects] = useState<string[]>([]);
  const [missingInfo, setMissingInfo] = useState('');

  // Step 4: MD Review request
  const [requestMDReview, setRequestMDReview] = useState(false);
  const [mdReviewReason, setMdReviewReason] = useState('');

  const totalSteps = hasSpecialistConsultation ? 4 : 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleValuableAspect = (aspect: string) => {
    setValuableAspects(prev =>
      prev.includes(aspect)
        ? prev.filter(a => a !== aspect)
        : [...prev, aspect]
    );
  };

  const handleSubmit = async () => {
    if (overallRating === 0 || outcomeSuccess === null) {
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData = {
        consultationId,
        patientId,
        feedback: {
          userSatisfaction: overallRating,
          outcomeSuccess,
          mdReview: requestMDReview ? {
            approved: false,
            reviewerName: null,
            reviewDate: null,
            specialistAccuracy: specialistRatings,
            improvementNotes: mdReviewReason
          } : undefined,
          followUpDataProvided: {
            valuableAspects,
            missingInfo: missingInfo.trim() || undefined
          }
        }
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });

      if (response.ok) {
        const result = await response.json();
        onFeedbackSubmitted?.(result.tokenRewards || []);
        onClose();
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) return overallRating > 0 && outcomeSuccess !== null;
    if (step === 2 && hasSpecialistConsultation) {
      return Object.keys(specialistRatings).length === specialists.length;
    }
    return true;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Share Your Feedback</h2>
                    <p className="text-indigo-100 text-sm mt-1">
                      Step {step} of {totalSteps}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white hover:text-indigo-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 bg-white bg-opacity-20 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / totalSteps) * 100}%` }}
                    className="h-full bg-white rounded-full"
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {/* Step 1: Overall Satisfaction */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          How satisfied are you with the consultation?
                        </label>
                        <div className="flex items-center justify-center space-x-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setOverallRating(star)}
                              className="transition-transform hover:scale-110"
                              type="button"
                            >
                              <svg
                                className={`w-12 h-12 ${
                                  star <= overallRating ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                        {overallRating > 0 && (
                          <p className="text-center mt-2 text-gray-600">
                            {overallRating === 5 && '⭐ Excellent!'}
                            {overallRating === 4 && '👍 Very Good'}
                            {overallRating === 3 && '😊 Good'}
                            {overallRating === 2 && '🤔 Fair'}
                            {overallRating === 1 && '😔 Needs Improvement'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          Did this consultation address your concern?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setOutcomeSuccess(true)}
                            className={`py-4 px-6 rounded-xl border-2 transition-all ${
                              outcomeSuccess === true
                                ? 'bg-green-100 border-green-500 text-green-800'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                            }`}
                            type="button"
                          >
                            <span className="text-2xl mb-2 block">✅</span>
                            <span className="font-semibold">Yes, fully addressed</span>
                          </button>
                          <button
                            onClick={() => setOutcomeSuccess(false)}
                            className={`py-4 px-6 rounded-xl border-2 transition-all ${
                              outcomeSuccess === false
                                ? 'bg-red-100 border-red-500 text-red-800'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                            }`}
                            type="button"
                          >
                            <span className="text-2xl mb-2 block">❌</span>
                            <span className="font-semibold">No, need more help</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Specialist Ratings (only for comprehensive mode) */}
                  {step === 2 && hasSpecialistConsultation && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <label className="block text-lg font-semibold text-gray-900 mb-4">
                        Rate each specialist&apos;s contribution
                      </label>
                      <div className="space-y-3">
                        {specialists.map((specialist) => (
                          <div
                            key={specialist.type}
                            className="bg-gray-50 rounded-xl p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-900">{specialist.name}</h4>
                                <p className="text-sm text-gray-600">{specialist.specialty}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  onClick={() =>
                                    setSpecialistRatings((prev) => ({ ...prev, [specialist.type]: rating }))
                                  }
                                  className="transition-transform hover:scale-110"
                                  type="button"
                                >
                                  <svg
                                    className={`w-8 h-8 ${
                                      rating <= (specialistRatings[specialist.type] || 0)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                </button>
                              ))}
                              <span className="ml-2 text-sm text-gray-600">
                                {specialistRatings[specialist.type] || 0}/5
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Valuable Aspects & Missing Info */}
                  {step === (hasSpecialistConsultation ? 3 : 2) && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          What was most valuable? (optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            'Diagnosis clarity',
                            'Treatment recommendations',
                            'Red flags identified',
                            'Timeline expectations',
                            'Exercise guidance',
                            'Pain management tips'
                          ].map((aspect) => (
                            <button
                              key={aspect}
                              onClick={() => toggleValuableAspect(aspect)}
                              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                                valuableAspects.includes(aspect)
                                  ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                                  : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-300'
                              }`}
                              type="button"
                            >
                              {valuableAspects.includes(aspect) ? '✓ ' : ''}
                              {aspect}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          What was missing? (optional)
                        </label>
                        <textarea
                          value={missingInfo}
                          onChange={(e) => setMissingInfo(e.target.value.slice(0, 200))}
                          placeholder="e.g., 'Recovery timeline', 'Cost estimates', 'Alternative treatments'"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                          rows={4}
                          maxLength={200}
                        />
                        <p className="text-xs text-gray-500 mt-1">{missingInfo.length}/200 characters</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: MD Review Request */}
                  {step === totalSteps && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-3">
                          Request Medical Doctor Review? (optional)
                        </label>
                        <p className="text-sm text-gray-600 mb-4">
                          A licensed physician can review this AI consultation for additional validation
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setRequestMDReview(true)}
                            className={`py-4 px-6 rounded-xl border-2 transition-all ${
                              requestMDReview
                                ? 'bg-blue-100 border-blue-500 text-blue-800'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                            }`}
                            type="button"
                          >
                            <span className="text-2xl mb-2 block">👨‍⚕️</span>
                            <span className="font-semibold">Yes, request review</span>
                          </button>
                          <button
                            onClick={() => setRequestMDReview(false)}
                            className={`py-4 px-6 rounded-xl border-2 transition-all ${
                              !requestMDReview
                                ? 'bg-gray-100 border-gray-500 text-gray-800'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                            }`}
                            type="button"
                          >
                            <span className="text-2xl mb-2 block">👍</span>
                            <span className="font-semibold">No thanks</span>
                          </button>
                        </div>
                      </div>

                      {requestMDReview && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3"
                        >
                          <label className="block text-sm font-semibold text-gray-900">
                            Why do you want a doctor&apos;s review? (optional)
                          </label>
                          <textarea
                            value={mdReviewReason}
                            onChange={(e) => setMdReviewReason(e.target.value.slice(0, 300))}
                            placeholder="e.g., 'Want confirmation before starting treatment', 'Symptoms seem unusual'"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                            rows={3}
                            maxLength={300}
                          />
                          <p className="text-xs text-gray-500">{mdReviewReason.length}/300 characters</p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    disabled={step === 1}
                    className="px-6 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    ← Back
                  </button>

                  {step < totalSteps ? (
                    <button
                      onClick={handleNext}
                      disabled={!isStepValid()}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isStepValid()}
                      className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        '🎉 Submit Feedback'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
