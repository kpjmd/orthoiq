'use client';

import { useState } from 'react';
import { getPhysicalFunctionBand, getPainInterferenceBand } from '@/lib/promis';
import { PROMISTimepoint } from '@/lib/promisTypes';
import { reconstructCardDataFromDB, getTierConfig, IntelligenceCardData } from '@/lib/intelligenceCardUtils';
import IntelligenceCard from './IntelligenceCard';
import IntelligenceCardModal from './IntelligenceCardModal';

export interface ConsultationRecord {
  consultationId: string;
  createdAt: string;
  mode: string;
  question: string;
  // IC gallery fields (only present for mode='normal')
  participatingSpecialists?: string[] | null;
  specialistCount?: number;
  tier?: string | null;
  consensusPercentage?: number | null;
  totalTokenStake?: number | null;
  mdReviewed?: boolean;
  mdApproved?: boolean;
  confidence?: number | null;
  responseText?: string | null;
  hasFeedback?: boolean;
}

export interface ProfileData {
  profile: {
    fid: string;
    displayName: string | null;
    username: string | null;
    pfpUrl: string | null;
    walletAddress: string | null;
    createdAt: string;
    lastSeen: string;
  } | null;
  stats: { totalConsultations: number };
  consultations: ConsultationRecord[];
  intelligenceCards: {
    total: number;
  };
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

export default function UserProfileView({ profileData, isLoading, onSelectMilestone }: UserProfileViewProps) {
  const [selectedCard, setSelectedCard] = useState<{
    cardData: IntelligenceCardData;
    consultation: ConsultationRecord;
  } | null>(null);

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

  const { profile, stats, consultations, intelligenceCards, promisHistory, pendingMilestones } = profileData;

  // Group PROMIS history by consultation
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
        <div className="flex items-center gap-4">
          {profile?.pfpUrl ? (
            <img
              src={profile.pfpUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
              {(profile?.displayName || profile?.username || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {profile?.displayName || profile?.username || `FID ${profile?.fid}`}
            </h2>
            {profile?.username && (
              <p className="text-sm text-gray-500">@{profile.username}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-400">FID {profile?.fid}</span>
              {profile?.walletAddress && (
                <span className="text-xs text-gray-400 font-mono">
                  {truncateAddress(profile.walletAddress)}
                </span>
              )}
            </div>
            {profile?.createdAt && (
              <p className="text-xs text-gray-400 mt-1">
                Member since {formatDate(profile.createdAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.totalConsultations}</p>
          <p className="text-xs text-gray-500 mt-1">Consultations</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{promisBaselinesCount}</p>
          <p className="text-xs text-gray-500 mt-1">PROMIS Baselines</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{intelligenceCards.total}</p>
          <p className="text-xs text-gray-500 mt-1">Intelligence Cards</p>
        </div>
      </div>

      {/* Intelligence Card Gallery */}
      {(() => {
        const normalConsultations = consultations.filter(c => c.mode === 'normal');
        if (normalConsultations.length === 0) return null;
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Intelligence Cards</h3>
            <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto">
              {normalConsultations.map((c) => {
                const cardData = reconstructCardDataFromDB(c);
                const tierConfig = getTierConfig(cardData.tier);
                return (
                  <button
                    key={c.consultationId}
                    onClick={() => setSelectedCard({ cardData, consultation: c })}
                    className="relative rounded-lg overflow-hidden border border-gray-200 hover:border-purple-300 transition-colors bg-slate-900"
                    style={{ height: '200px' }}
                  >
                    <div className="absolute top-0 left-0 transform scale-[0.48] origin-top-left">
                      <IntelligenceCard data={cardData} size="small" animated={false} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-6">
                      <div className="flex items-center gap-1 mb-1">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: tierConfig.borderColor }}
                        >
                          {tierConfig.label}
                        </span>
                        <span className="text-[10px] text-white/60">
                          {cardData.consensusPercentage}%
                        </span>
                      </div>
                      <p className="text-[11px] text-white truncate">{c.question}</p>
                      <p className="text-[10px] text-white/50">{formatDate(c.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Intelligence Card Modal for gallery selection */}
      {selectedCard && (
        <IntelligenceCardModal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          rawConsultationData={{
            consultationId: selectedCard.consultation.consultationId,
            participatingSpecialists: selectedCard.consultation.participatingSpecialists || [],
            responses: (selectedCard.consultation.participatingSpecialists || []).map((spec: string) => ({
              response: {
                specialistType: spec,
                specialist: spec,
                confidence: selectedCard.consultation.confidence || 0.8,
                response: selectedCard.consultation.responseText || '',
              }
            })),
            synthesizedRecommendations: {
              synthesis: selectedCard.consultation.responseText || '',
              confidenceFactors: {
                overallConfidence: selectedCard.consultation.confidence || 0.75,
                interAgentAgreement: selectedCard.consultation.consensusPercentage || 0.85,
              },
            },
          }}
          userFeedback={selectedCard.consultation.hasFeedback ? { satisfied: true } : undefined}
          mdReview={selectedCard.consultation.mdReviewed && selectedCard.consultation.mdApproved ? { approved: true } : undefined}
          fid={profile?.fid || ''}
          isMiniApp={false}
        />
      )}

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
                      ? -(fu.piTScore - baseline.piTScore)  // reversed: positive = improvement
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

      {/* Token Placeholder */}
      {profile?.walletAddress && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Wallet</h3>
          <p className="text-sm font-mono text-gray-600 break-all">{profile.walletAddress}</p>
          <p className="text-xs text-gray-400 mt-2">OrthoIQ Token: Coming soon (testnet)</p>
        </div>
      )}
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
      {positive ? ' \u2191' : ' \u2193'}
    </span>
  );
}
