'use client';

import { useEffect, useState } from 'react';

interface AgentLiveStats {
  totalSearches: number;
  totalCitations: number;
  avgResponseTime: number;
  tokenBalance: number;
}

interface ResearchData {
  totalSyntheses: number;
  synthesesLast7Days: number;
  uniqueResearchers: number;
  totalStudiesAnalyzed: number;
  mdReviewedCount: number;
  mdReviewRate: number;
  avgStudyCount: number;
  avgCitations: number;
  avgImpactFactor: number;
  evidenceDistribution: Array<{ strength: string; count: number }>;
  rarityDistribution: Array<{ tier: string; count: number }>;
  volumeTrend: Array<{ date: string; count: number }>;
  topConditions: Array<{ condition: string; count: number }>;
  subscriptionsByTier: Array<{ tier: string; total: number; active: number }>;
  agentLiveStats: AgentLiveStats | null;
}

const EVIDENCE_COLORS: Record<string, string> = {
  strong: 'bg-green-500',
  moderate: 'bg-blue-500',
  weak: 'bg-yellow-400',
  insufficient: 'bg-red-400',
  unknown: 'bg-gray-300',
};

const EVIDENCE_TEXT_COLORS: Record<string, string> = {
  strong: 'text-green-700',
  moderate: 'text-blue-700',
  weak: 'text-yellow-700',
  insufficient: 'text-red-700',
  unknown: 'text-gray-500',
};

const RARITY_COLORS: Record<string, string> = {
  platinum: 'bg-gradient-to-br from-purple-400 to-indigo-500',
  gold: 'bg-gradient-to-br from-yellow-400 to-amber-500',
  silver: 'bg-gradient-to-br from-gray-300 to-gray-400',
  bronze: 'bg-gradient-to-br from-orange-300 to-orange-500',
};

const RARITY_LABELS: Record<string, string> = {
  platinum: '🔬 Platinum',
  gold: '⭐ Gold',
  silver: '🥈 Silver',
  bronze: '🥉 Bronze',
};

const TIER_COLORS: Record<string, string> = {
  institution: 'text-purple-600',
  practitioner: 'text-blue-600',
  scholar: 'text-green-600',
};

export function ResearchAgentMetrics() {
  const [data, setData] = useState<ResearchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/research/metrics');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch research metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded"></div>)}
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-gray-500">Failed to load research metrics</p>
      </div>
    );
  }

  const hasAnyData = data.totalSyntheses > 0;
  const totalEvidence = data.evidenceDistribution.reduce((s, r) => s + r.count, 0);
  const maxTrend = data.volumeTrend.length > 0 ? Math.max(...data.volumeTrend.map(d => d.count)) : 1;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">Research Agent Performance</h2>
        <p className="text-sm text-gray-500">Evidence synthesis and subscription metrics</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Top 4 metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{data.totalSyntheses}</div>
            <div className="text-sm text-gray-600">Total Syntheses</div>
            {data.synthesesLast7Days > 0 && (
              <div className="text-xs text-green-600 font-medium mt-1">+{data.synthesesLast7Days} this week</div>
            )}
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{data.uniqueResearchers}</div>
            <div className="text-sm text-gray-600">Unique Researchers</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {data.avgCitations > 0 ? data.avgCitations.toFixed(0) : '—'}
            </div>
            <div className="text-sm text-gray-600">Avg Citations</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {data.avgImpactFactor > 0 ? data.avgImpactFactor.toFixed(2) : '—'}
            </div>
            <div className="text-sm text-gray-600">Avg Impact Factor</div>
          </div>
        </div>

        {!hasAnyData && data.agentLiveStats && data.agentLiveStats.totalSearches > 0 && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-cyan-700 mb-3 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              Live Session — Research Agent (agents service)
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-cyan-700">{data.agentLiveStats.totalSearches}</div>
                <div className="text-xs text-gray-600">Searches This Session</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-700">{data.agentLiveStats.totalCitations}</div>
                <div className="text-xs text-gray-600">Citations Found</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-700">
                  {data.agentLiveStats.avgResponseTime > 0 ? `${(data.agentLiveStats.avgResponseTime / 1000).toFixed(1)}s` : '—'}
                </div>
                <div className="text-xs text-gray-600">Avg Response Time</div>
              </div>
            </div>
            <p className="text-xs text-cyan-600 mt-3 text-center">
              Live data from running agent session. Detailed synthesis records appear here after DB persistence is complete.
            </p>
          </div>
        )}

        {!hasAnyData && (!data.agentLiveStats || data.agentLiveStats.totalSearches === 0) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
            No research syntheses generated yet.
          </div>
        )}

        {hasAnyData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Evidence Strength Distribution */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Evidence Strength</h3>
                {data.evidenceDistribution.length === 0 ? (
                  <p className="text-xs text-gray-400">No data</p>
                ) : (
                  <>
                    {/* Stacked bar */}
                    <div className="flex h-6 rounded-lg overflow-hidden mb-3">
                      {data.evidenceDistribution.map(({ strength, count }) => {
                        const pct = totalEvidence > 0 ? (count / totalEvidence) * 100 : 0;
                        if (pct === 0) return null;
                        return (
                          <div
                            key={strength}
                            className={`${EVIDENCE_COLORS[strength] || 'bg-gray-300'} flex items-center justify-center text-white text-xs font-medium`}
                            style={{ width: `${pct}%` }}
                            title={`${strength}: ${count} (${Math.round(pct)}%)`}
                          >
                            {pct >= 15 && `${Math.round(pct)}%`}
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-1.5">
                      {data.evidenceDistribution.map(({ strength, count }) => {
                        const pct = totalEvidence > 0 ? Math.round((count / totalEvidence) * 100) : 0;
                        return (
                          <div key={strength} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-sm ${EVIDENCE_COLORS[strength] || 'bg-gray-300'}`} />
                              <span className={`capitalize font-medium ${EVIDENCE_TEXT_COLORS[strength] || 'text-gray-600'}`}>
                                {strength}
                              </span>
                            </div>
                            <span className="text-gray-700 font-semibold">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Rarity Tier Distribution */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Rarity Tiers</h3>
                <div className="grid grid-cols-2 gap-2">
                  {data.rarityDistribution.map(({ tier, count }) => (
                    <div key={tier} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <div className={`w-8 h-8 rounded-full ${RARITY_COLORS[tier] || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {count}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-800">
                          {RARITY_LABELS[tier] || tier}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 30-day volume trend */}
            {data.volumeTrend.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Research Volume (Last 30 Days)</h3>
                <div className="h-20 flex items-end space-x-0.5">
                  {data.volumeTrend.map((day, idx) => {
                    const height = maxTrend > 0 ? (day.count / maxTrend) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-cyan-500 rounded-t hover:bg-cyan-600 transition-colors cursor-pointer"
                        style={{ height: `${height}%`, minHeight: day.count > 0 ? '3px' : '0' }}
                        title={`${day.date}: ${day.count} syntheses`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subscriptions */}
              {data.subscriptionsByTier.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Research Subscriptions</h3>
                  <div className="space-y-2 text-sm">
                    {data.subscriptionsByTier.map(({ tier, total, active }) => (
                      <div key={tier} className="flex justify-between">
                        <span className={`capitalize font-medium ${TIER_COLORS[tier] || 'text-gray-600'}`}>{tier}</span>
                        <span className="text-gray-700">
                          <span className="font-semibold">{active}</span> active / {total} total
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top conditions */}
              {data.topConditions.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Queried Conditions</h3>
                  <div className="space-y-1.5">
                    {data.topConditions.slice(0, 5).map(({ condition, count }, idx) => (
                      <div key={condition} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-4">#{idx + 1}</span>
                          <span className="text-gray-700 truncate max-w-[140px]">{condition}</span>
                        </div>
                        <span className="text-gray-500 font-medium text-xs">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MD Review rate */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
              <span className="text-gray-600">MD Review Rate</span>
              <span className="font-semibold text-gray-900">
                {data.mdReviewRate}% <span className="text-gray-400 font-normal">({data.mdReviewedCount} of {data.totalSyntheses})</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
