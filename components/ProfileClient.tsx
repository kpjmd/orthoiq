'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useWebAuth } from './WebAuthProvider';
import UserProfileView, { ProfileData } from './UserProfileView';
import PROMISQuestionnaire from './PROMISQuestionnaire';
import { WalletVerifyButton } from './WalletSignIn';
import { PROMISTimepoint } from '@/lib/promisTypes';

interface ActiveMilestone {
  consultationId: string;
  timepoint: PROMISTimepoint;
}

export default function ProfileClient() {
  const { user, isLoading: authLoading, signOut } = useWebAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<ActiveMilestone | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/web/profile', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          setError('Your session has expired. Please sign in again.');
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to load profile');
        }
        setProfileData(null);
        return;
      }
      const data = await res.json();
      setProfileData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSelectMilestone = (consultationId: string, timepoint: PROMISTimepoint) => {
    setActiveMilestone({ consultationId, timepoint });
  };

  const handleMilestoneComplete = () => {
    setActiveMilestone(null);
    loadProfile();
  };

  const isPainRelated =
    !!activeMilestone &&
    !!profileData?.promisHistory.some(
      (r) => r.consultationId === activeMilestone.consultationId && r.piTScore != null
    );

  return (
    <div className="container mx-auto max-w-3xl">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <Link href="/" className="text-blue-600 text-sm hover:underline">
          ← Back
        </Link>
        <h1 className="text-base font-semibold text-gray-900">Your profile</h1>
        <button
          onClick={signOut}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {verifyError && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{verifyError}</p>
        </div>
      )}

      {verifyMessage && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{verifyMessage}</p>
        </div>
      )}

      {/* If the user has a session but no wallet at all, surface a connect prompt. */}
      {!authLoading && user && !user.walletAddress && (
        <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-900">Link a wallet</p>
            <p className="text-xs text-blue-700">
              Connect a wallet so we can attach any prior wallet consultations to your profile.
            </p>
          </div>
          <WalletVerifyButton
            backfill
            label="Connect & verify"
            onSuccess={({ backfilledCount }) => {
              setVerifyError(null);
              setVerifyMessage(
                backfilledCount && backfilledCount > 0
                  ? `Wallet linked. ${backfilledCount} prior consultation${backfilledCount === 1 ? '' : 's'} attached.`
                  : 'Wallet linked.'
              );
              loadProfile();
            }}
            onError={(msg) => {
              setVerifyMessage(null);
              setVerifyError(msg);
            }}
          />
        </div>
      )}

      <UserProfileView
        profileData={profileData}
        isLoading={loading}
        onSelectMilestone={handleSelectMilestone}
        onVerifyWallet={
          user?.walletAddress && !user.walletVerified
            ? undefined // The unverified-wallet click is wired through the prompt above when no walletAddress exists
            : undefined
        }
      />

      {activeMilestone && user && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <PROMISQuestionnaire
              timepoint={activeMilestone.timepoint}
              consultationId={activeMilestone.consultationId}
              isPainRelated={isPainRelated}
              patientId={user.id}
              webUserId={user.id}
              onComplete={handleMilestoneComplete}
              onSkip={() => setActiveMilestone(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
