'use client';

import { getPhysicalFunctionBand, getPainInterferenceBand } from '@/lib/promis';
import { PROMISTimepoint } from '@/lib/promisTypes';

export interface ConsultationRecord {
  consultationId: string;
  createdAt: string;
  mode: string;
  question: string;
}

export type ProfileIdentity =
  | {
      kind: 'fid';
      fid: string;
      displayName: string | null;
      username: string | null;
      pfpUrl: string | null;
      walletAddress: string | null;
      createdAt: string;
      lastSeen: string;
    }
  | {
      kind: 'webUser';
      webUserId: string;
      email: string | null;
      displayName: string | null;
      initials: string;
      walletAddress: string | null;
      walletVerified: boolean;
      createdAt: string;
      lastLogin: string | null;
    };

export interface ProfileData {
  profile: ProfileIdentity | null;
  stats: { totalConsultations: number };
  consultations: ConsultationRecord[];
  promisHistory: Array<{
    consultationId: string;
    question: string;
    date: string;
    timepoint: string;
    pfTScore: number;
    piTScore: number | null;
  }>;
  pendingMilestones: Array<{
    consultationId: string;
    question: string;
    date: string;
    pendingTimepoints: string[];
  }>;
}

interface UserProfileViewProps {
  profileData: ProfileData | null;
  isLoading: boolean;
  onSelectMilestone: (consultationId: string, timepoint: PROMISTimepoint) => void;
  /** Web-only: invoked when user clicks "Verify wallet ownership" on an unverified wallet */
  onVerifyWallet?: () => void;
}

const TIMEPOINT_LABELS: Record<string, string> = {
  baseline: 'Baseline',
  '2week': '2-Week',
  '4week': '4-Week',
  '8week': '8-Week',
};

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UserProfileView({
  profileData,
  isLoading,
  onSelectMilestone,
  onVerifyWallet,
}: UserProfileViewProps) {
  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="text-gray-500">Unable to load profile data.</p>
      </div>
    );
  }

  const { profile, stats, consultations, promisHistory, pendingMilestones } = profileData;

  const promisGrouped = new Map<string, typeof promisHistory>();
  for (const entry of promisHistory) {
    const key = entry.consultationId;
    if (!promisGrouped.has(key)) promisGrouped.set(key, []);
    promisGrouped.get(key)!.push(entry);
  }

  const promisBaselinesCount = Array.from(promisGrouped.values()).filter(
    entries => entries.some(e => e.timepoint === 'baseline')
  ).length;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Identity Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {profile?.kind === 'fid' ? (
          <FidIdentityCard profile={profile} />
        ) : profile?.kind === 'webUser' ? (
          <WebUserIdentityCard profile={profile} onVerifyWallet={onVerifyWallet} />
        ) : null}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.totalConsultations}</p>
          <p className="text-xs text-gray-500 mt-1">Consultations</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{promisBaselinesCount}</p>
          <p className="text-xs text-gray-500 mt-1">PROMIS Baselines</p>
        </div>
      </div>

      {/* Pending Milestones */}
      {pendingMilestones.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">Pending Check-ins</h3>
          <div className="space-y-3">
            {pendingMilestones.map((milestone) => (
              <div key={milestone.consultationId} className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-sm text-gray-700 font-medium truncate mb-2">
                  {milestone.question}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {milestone.pendingTimepoints.map((tp) => (
                    <button
                      key={tp}
                      onClick={() => onSelectMilestone(milestone.consultationId, tp as PROMISTimepoint)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                    >
                      {TIMEPOINT_LABELS[tp] || tp} Check-in
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROMIS History */}
      {promisGrouped.size > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">PROMIS Scores</h3>
          <div className="space-y-4">
            {Array.from(promisGrouped.entries()).map(([consultationId, entries]) => {
              const baseline = entries.find(e => e.timepoint === 'baseline');
              const followups = entries.filter(e => e.timepoint !== 'baseline');

              return (
                <div key={consultationId} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-xs text-gray-500 mb-2 truncate">
                    {baseline?.question || entries[0]?.question}
                    {baseline && (
                      <span className="ml-2 text-gray-400">{formatDate(baseline.date)}</span>
                    )}
                  </p>
                  {baseline && (
                    <div className="flex gap-3 mb-1">
                      <ScoreBadge
                        label="Physical Function"
                        tScore={baseline.pfTScore}
                        band={getPhysicalFunctionBand(baseline.pfTScore)}
                      />
                      {baseline.piTScore != null && (
                        <ScoreBadge
                          label="Pain Interference"
                          tScore={baseline.piTScore}
                          band={getPainInterferenceBand(baseline.piTScore)}
                        />
                      )}
                    </div>
                  )}
                  {followups.map(fu => {
                    const pfDelta = baseline ? fu.pfTScore - baseline.pfTScore : 0;
                    const piDelta = baseline && baseline.piTScore != null && fu.piTScore != null
                      ? -(fu.piTScore - baseline.piTScore)
                      : null;

                    return (
                      <div key={fu.timepoint} className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <span className="font-medium w-16">{TIMEPOINT_LABELS[fu.timepoint] || fu.timepoint}</span>
                        <span>
                          PF: {fu.pfTScore}
                          <DeltaArrow value={pfDelta} />
                        </span>
                        {fu.piTScore != null && (
                          <span className="ml-2">
                            PI: {fu.piTScore}
                            {piDelta != null && <DeltaArrow value={piDelta} />}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consultation History */}
      {consultations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Consultation History</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {consultations.map((c) => (
              <div key={c.consultationId} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{c.question}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                  {c.mode === 'normal' ? 'Full' : 'Fast'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallet section (fid mode only — web mode shows wallet inline in identity card) */}
      {profile?.kind === 'fid' && profile.walletAddress && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Wallet</h3>
          <p className="text-sm font-mono text-gray-600 break-all">{profile.walletAddress}</p>
          <p className="text-xs text-gray-400 mt-2">OrthoIQ Token: Coming soon (testnet)</p>
        </div>
      )}
    </div>
  );
}

function FidIdentityCard({
  profile,
}: {
  profile: Extract<ProfileIdentity, { kind: 'fid' }>;
}) {
  return (
    <div className="flex items-center gap-4">
      {profile.pfpUrl ? (
        <img
          src={profile.pfpUrl}
          alt="Profile"
          className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
          {(profile.displayName || profile.username || '?')[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-gray-900 truncate">
          {profile.displayName || profile.username || `FID ${profile.fid}`}
        </h2>
        {profile.username && (
          <p className="text-sm text-gray-500">@{profile.username}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">FID {profile.fid}</span>
          {profile.walletAddress && (
            <span className="text-xs text-gray-400 font-mono">
              {truncateAddress(profile.walletAddress)}
            </span>
          )}
        </div>
        {profile.createdAt && (
          <p className="text-xs text-gray-400 mt-1">
            Member since {formatDate(profile.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function WebUserIdentityCard({
  profile,
  onVerifyWallet,
}: {
  profile: Extract<ProfileIdentity, { kind: 'webUser' }>;
  onVerifyWallet?: () => void;
}) {
  const primaryLine = profile.email ?? 'Wallet user';
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
        {profile.initials}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-gray-900 truncate">{primaryLine}</h2>
        {profile.walletAddress && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-500 font-mono">
              {truncateAddress(profile.walletAddress)}
            </span>
            {profile.walletVerified ? (
              <span className="text-xs text-green-600 font-medium">✓ Verified</span>
            ) : onVerifyWallet ? (
              <button
                onClick={onVerifyWallet}
                className="text-xs text-blue-600 hover:underline"
              >
                Verify ownership
              </button>
            ) : (
              <span className="text-xs text-amber-600">Unverified</span>
            )}
          </div>
        )}
        {profile.createdAt && (
          <p className="text-xs text-gray-400 mt-1">
            Member since {formatDate(profile.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ label, tScore, band }: { label: string; tScore: number; band: { label: string; color: string } }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: band.color }} />
      <span className="text-xs text-gray-600">
        {label}: <span className="font-semibold">{tScore}</span>
        <span className="text-gray-400 ml-1">({band.label})</span>
      </span>
    </div>
  );
}

function DeltaArrow({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`ml-1 ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive ? '+' : ''}{value.toFixed(1)}
      {positive ? ' ↑' : ' ↓'}
    </span>
  );
}
