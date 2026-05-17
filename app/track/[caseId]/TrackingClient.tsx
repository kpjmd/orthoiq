'use client';

import { useState } from 'react';
import MilestoneLandingView from '@/components/MilestoneLandingView';
import type { LandingPayload } from '@/lib/landing/buildLandingPayload';

interface TrackingClientProps {
  caseId: string;
  fid: string;
  payload: LandingPayload;
}

export default function TrackingClient({ caseId, fid, payload }: TrackingClientProps) {
  const [isPrivate, setIsPrivate] = useState(payload.consultation.isPrivate);

  const handlePrivacyToggle = async () => {
    try {
      const response = await fetch(`/api/consultations/${caseId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, isPrivate: !isPrivate }),
      });
      if (response.ok) setIsPrivate(!isPrivate);
    } catch (error) {
      console.error('Error updating privacy:', error);
    }
  };

  const allComplete = payload.completedCount >= payload.totalMilestones;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Slim header — case id + privacy toggle */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-medium text-gray-200">Case #{caseId}</h1>
          <button
            onClick={handlePrivacyToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isPrivate
                ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40'
                : 'bg-green-600/20 text-green-400 border border-green-600/40'
            }`}
          >
            {isPrivate ? 'Private' : 'Public'}
          </button>
        </div>

        <MilestoneLandingView
          payload={payload}
          patientId={fid}
          footerSlot={
            <>
              {allComplete && (
                <div className="mt-6 border-t border-gray-700 pt-6 text-sm text-gray-400">
                  All check-ins on file.
                </div>
              )}
              {payload.consultation.coordinationSummary && (
                <details className="mt-6 bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                  <summary className="text-sm text-gray-400 cursor-pointer">
                    Original recommendations
                  </summary>
                  <p className="mt-3 text-sm text-gray-300 whitespace-pre-wrap">
                    {payload.consultation.coordinationSummary}
                  </p>
                </details>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
