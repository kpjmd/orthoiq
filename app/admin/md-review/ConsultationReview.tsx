'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ConsultationDetail {
  consultationId: string;
  questionId: number;
  fid: string;
  mode: string;
  createdAt: string;
  userQuestion: string;
  aiResponse: string;
  confidence: number;
  specialistCount: number;
  participatingSpecialists: any;
  coordinationSummary: string;
  consensus: number;
  tier: string;
  mdReviewed: boolean;
  mdApproved?: boolean;
  mdClinicalAccuracy?: number;
  mdFeedbackNotes?: string;
  mdReviewedAt?: string;
  userSatisfaction?: number;
  outcomeSuccess?: boolean;
  milestones: Array<{
    milestoneDay: number;
    painLevel: number;
    functionalScore: number;
    overallProgress: string;
    milestoneAchieved: boolean;
    createdAt: string;
  }>;
}

export function ConsultationReview() {
  const searchParams = useSearchParams();
  const consultationId = searchParams.get('consultationId');

  const [consultation, setConsultation] = useState<ConsultationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [approved, setApproved] = useState(true);
  const [clinicalAccuracy, setClinicalAccuracy] = useState(4);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  const fetchConsultation = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/md-review?consultationId=${consultationId}`);
      if (res.ok) {
        const data = await res.json();
        setConsultation(data);

        // Pre-fill if already reviewed
        if (data.mdReviewed) {
          setApproved(data.mdApproved || false);
          setClinicalAccuracy(data.mdClinicalAccuracy || 4);
          setFeedbackNotes(data.mdFeedbackNotes || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch consultation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    if (consultationId) {
      fetchConsultation();
    }
  }, [consultationId, fetchConsultation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/md-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          approved,
          clinicalAccuracy,
          feedbackNotes,
          reviewerFid: '15230'
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`✅ Review submitted successfully!\n\n${result.message}`);
        // Refresh consultation data
        await fetchConsultation();
      } else {
        const error = await res.json();
        alert(`❌ Failed to submit review: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('❌ Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!consultationId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-gray-500">No consultation ID provided</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-red-500">Consultation not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">MD Review</h2>
            <p className="text-sm text-gray-500">Consultation ID: {consultation.consultationId}</p>
          </div>
          {consultation.mdReviewed && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
              ✅ Already Reviewed
            </div>
          )}
        </div>

        {/* Consultation Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500">Current Tier</div>
            <div className="text-sm font-semibold text-gray-900">{consultation.tier || 'standard'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Specialists</div>
            <div className="text-sm font-semibold text-gray-900">{consultation.specialistCount || 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Consensus</div>
            <div className="text-sm font-semibold text-gray-900">
              {consultation.consensus ? `${Math.round(consultation.consensus * 100)}%` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">User Satisfaction</div>
            <div className="text-sm font-semibold text-gray-900">
              {consultation.userSatisfaction ? `${consultation.userSatisfaction.toFixed(1)}/10` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* User Question & AI Response */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation Details</h3>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">User Question:</div>
            <div className="bg-blue-50 p-4 rounded-lg text-gray-900">
              {consultation.userQuestion}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">AI Response:</div>
            <div className="bg-gray-50 p-4 rounded-lg text-gray-900 max-h-96 overflow-y-auto whitespace-pre-wrap">
              {consultation.aiResponse || consultation.coordinationSummary}
            </div>
          </div>

          {consultation.participatingSpecialists && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Participating Specialists:</div>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-900">
                {JSON.stringify(consultation.participatingSpecialists, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Milestone Validations */}
      {consultation.milestones && consultation.milestones.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Outcome Validations</h3>
          <div className="space-y-3">
            {consultation.milestones.map((milestone, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900">Week {milestone.milestoneDay / 7}</div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    milestone.milestoneAchieved
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {milestone.overallProgress}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Pain Level:</span>
                    <span className="ml-2 font-medium">{milestone.painLevel}/10</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Functional Score:</span>
                    <span className="ml-2 font-medium">{milestone.functionalScore}/100</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MD Review Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">MD Review Assessment</h3>

        <div className="space-y-4">
          {/* Approval Decision */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Decision
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setApproved(true)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  approved
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ✅ Approve
              </button>
              <button
                type="button"
                onClick={() => setApproved(false)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  !approved
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ❌ Needs Revision
              </button>
            </div>
          </div>

          {/* Clinical Accuracy Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinical Accuracy: {clinicalAccuracy}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={clinicalAccuracy}
              onChange={(e) => setClinicalAccuracy(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 - Poor</span>
              <span>2 - Fair</span>
              <span>3 - Good</span>
              <span>4 - Very Good</span>
              <span>5 - Excellent</span>
            </div>
          </div>

          {/* Feedback Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback Notes (optional)
            </label>
            <textarea
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any corrections, recommendations, or teaching notes..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <Link
              href="/admin/dashboard"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </form>

      {/* Previous Review (if exists) */}
      {consultation.mdReviewed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Review</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Approved:</span>
              <span className="font-semibold">{consultation.mdApproved ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Clinical Accuracy:</span>
              <span className="font-semibold">{consultation.mdClinicalAccuracy}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reviewed At:</span>
              <span className="font-semibold">
                {consultation.mdReviewedAt ? new Date(consultation.mdReviewedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
            {consultation.mdFeedbackNotes && (
              <div>
                <div className="text-gray-600 mb-1">Notes:</div>
                <div className="bg-white p-3 rounded border">{consultation.mdFeedbackNotes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
