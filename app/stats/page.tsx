'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AgentLiveStats {
  totalSearches: number;
  totalCitations: number;
  avgResponseTime: number;
  tokenBalance: number;
}

interface ResearchPublicStats {
  totalSyntheses: number;
  totalStudiesAnalyzed: number;
  avgImpactFactor: number;
  avgCitations: number;
  evidenceDistribution: Array<{ strength: string; count: number }>;
  rarityDistribution: Array<{ tier: string; count: number }>;
  agentLiveStats: AgentLiveStats | null;
}

interface PROMISPublicStats {
  totalConsultations: number;
  baselineCaptureCount: number;
  baselineCaptureRate: number;
  followUpCompletion: {
    baseline: number;
    week2: number;
    week4: number;
    week8: number;
  };
  followUpRates: {
    week2: number;
    week4: number;
    week8: number;
  };
  clinicallyImprovedCount: number;
  clinicallyImprovedRate: number;
  totalWithFollowup: number;
  avgBaselinePfScore: number | null;
  avgBaselinePiScore: number | null;
}

interface QueryTypeBreakdown {
  clinical: number;
  informational: number;
  clinicalPct: number;
  informationalPct: number;
}

interface PublicStats {
  totalConsultations: number;
  averageAgents: number;
  averageConsensus: number;
  researchStats: ResearchPublicStats | null;
  promisStats: PROMISPublicStats | null;
  queryTypeBreakdown: QueryTypeBreakdown | null;
}

export default function PublicStatsPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backHref, setBackHref] = useState('/miniapp');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'web') {
      setBackHref('/');
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [overviewRes, researchRes, promisRes] = await Promise.all([
        fetch('/api/admin/metrics/overview'),
        fetch('/api/admin/research/metrics'),
        fetch('/api/admin/promis/metrics'),
      ]);

      const [overview, research, promis] = await Promise.all([
        overviewRes.ok ? overviewRes.json() : null,
        researchRes.ok ? researchRes.json() : null,
        promisRes.ok ? promisRes.json() : null,
      ]);

      setStats({
        totalConsultations: overview?.totalConsultations || 0,
        averageAgents: overview?.averageAgentsPerConsultation || 0,
        averageConsensus: overview?.averageMDApprovalRate || 0,
        researchStats: research ? {
          totalSyntheses: research.totalSyntheses || 0,
          totalStudiesAnalyzed: research.totalStudiesAnalyzed || 0,
          avgImpactFactor: research.avgImpactFactor || 0,
          avgCitations: research.avgCitations || 0,
          evidenceDistribution: research.evidenceDistribution || [],
          rarityDistribution: research.rarityDistribution || [],
          agentLiveStats: research.agentLiveStats || null,
        } : null,
        queryTypeBreakdown: overview?.queryTypeBreakdown || null,
        promisStats: promis ? {
          totalConsultations: promis.totalConsultations || 0,
          baselineCaptureCount: promis.baselineCaptureCount || 0,
          baselineCaptureRate: promis.baselineCaptureRate || 0,
          followUpCompletion: promis.followUpCompletion || { baseline: 0, week2: 0, week4: 0, week8: 0 },
          followUpRates: promis.followUpRates || { week2: 0, week4: 0, week8: 0 },
          clinicallyImprovedCount: promis.clinicallyImprovedCount || 0,
          clinicallyImprovedRate: promis.clinicallyImprovedRate || 0,
          totalWithFollowup: promis.totalWithFollowup || 0,
          avgBaselinePfScore: promis.avgBaselinePfScore ?? null,
          avgBaselinePiScore: promis.avgBaselinePiScore ?? null,
        } : null,
      });
    } catch (error) {
      console.error('Failed to fetch public stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-900 to-purple-600 text-white p-8">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">OrthoIQ Network Statistics</h1>
            <p className="text-xl opacity-90">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Failed to load statistics</p>
        </div>
      </div>
    );
  }

  // Research stats: prefer live agent stats when local DB is empty
  const rs = stats.researchStats;
  const liveStats = rs?.agentLiveStats;
  const hasLocalResearchData = (rs?.totalSyntheses ?? 0) > 0;
  const hasLiveResearchData = (liveStats?.totalSearches ?? 0) > 0;
  const showResearchPanel = hasLocalResearchData || hasLiveResearchData;

  const researchSearchCount = hasLocalResearchData ? rs!.totalSyntheses : (liveStats?.totalSearches ?? 0);
  const researchCitationsTotal = hasLocalResearchData ? null : (liveStats?.totalCitations ?? 0);
  const avgCitationsPerConsult = hasLocalResearchData
    ? (rs!.avgCitations > 0 ? rs!.avgCitations : null)
    : (liveStats && liveStats.totalSearches > 0 ? Math.round((liveStats.totalCitations / liveStats.totalSearches) * 10) / 10 : null);

  // PROMIS panel visibility
  const ps = stats.promisStats;
  const showPromisPanel = ps !== null && ps.baselineCaptureCount >= 0;
  const hasPromisData = (ps?.baselineCaptureCount ?? 0) >= 5;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-purple-600 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <Link
              href={backHref}
              className="inline-flex items-center px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-sm transition-colors"
            >
              ← Back to App
            </Link>
            <div className="w-24"></div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">OrthoIQ Network Statistics</h1>
            <p className="text-xl opacity-90">Transparent AI agent performance metrics</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Network Overview */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Network Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {stats.totalConsultations.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Consultations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {typeof stats.averageAgents === 'string' ? stats.averageAgents : stats.averageAgents.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Average Agents per Case</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {Math.round(stats.averageConsensus * 100)}%
              </div>
              <div className="text-sm text-gray-600">Average Consensus</div>
            </div>
          </div>
        </div>

        {/* Query Type Breakdown */}
        {stats.queryTypeBreakdown && (stats.queryTypeBreakdown.clinical + stats.queryTypeBreakdown.informational) > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Query Type Breakdown</h2>
            <p className="text-sm text-gray-500 mb-6">How queries are routed through the system</p>

            {/* Split bar */}
            <div className="flex h-8 rounded-lg overflow-hidden mb-3">
              {stats.queryTypeBreakdown.clinicalPct > 0 && (
                <div
                  className="bg-blue-500 flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${stats.queryTypeBreakdown.clinicalPct}%` }}
                  title={`Clinical: ${stats.queryTypeBreakdown.clinical} (${stats.queryTypeBreakdown.clinicalPct}%)`}
                >
                  {stats.queryTypeBreakdown.clinicalPct >= 15 && `${stats.queryTypeBreakdown.clinicalPct}%`}
                </div>
              )}
              {stats.queryTypeBreakdown.informationalPct > 0 && (
                <div
                  className="bg-teal-500 flex items-center justify-center text-white text-sm font-medium"
                  style={{ width: `${stats.queryTypeBreakdown.informationalPct}%` }}
                  title={`Informational: ${stats.queryTypeBreakdown.informational} (${stats.queryTypeBreakdown.informationalPct}%)`}
                >
                  {stats.queryTypeBreakdown.informationalPct >= 15 && `${stats.queryTypeBreakdown.informationalPct}%`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">Clinical</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">{stats.queryTypeBreakdown.clinical}</div>
                <p className="text-xs text-gray-500 mt-1">Multi-specialist consensus analysis</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm bg-teal-500" />
                  <span className="text-sm font-semibold text-gray-700">Informational</span>
                </div>
                <div className="text-3xl font-bold text-teal-600">{stats.queryTypeBreakdown.informational}</div>
                <p className="text-xs text-gray-500 mt-1">Lightweight triage for general orthopedic questions</p>
              </div>
            </div>
          </div>
        )}

        {/* Research Agent Panel */}
        {showResearchPanel && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Research Agent</h2>
              {hasLiveResearchData && !hasLocalResearchData && (
                <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse inline-block"></span>
                  Live session
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-6">AI-powered evidence synthesis from peer-reviewed literature</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600 mb-1">
                  {researchSearchCount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Research Queries</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600 mb-1">
                  {avgCitationsPerConsult !== null ? avgCitationsPerConsult.toFixed(1) : '—'}
                </div>
                <div className="text-sm text-gray-600">Avg Citations / Query</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600 mb-1">
                  {hasLocalResearchData
                    ? rs!.totalStudiesAnalyzed.toLocaleString()
                    : researchCitationsTotal !== null
                      ? researchCitationsTotal.toLocaleString()
                      : '—'}
                </div>
                <div className="text-sm text-gray-600">{hasLocalResearchData ? 'Studies Analyzed' : 'Citations Found'}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600 mb-1">
                  {hasLocalResearchData && rs!.avgImpactFactor > 0
                    ? rs!.avgImpactFactor.toFixed(1)
                    : liveStats && liveStats.avgResponseTime > 0
                      ? `${(liveStats.avgResponseTime / 1000).toFixed(1)}s`
                      : '—'}
                </div>
                <div className="text-sm text-gray-600">
                  {hasLocalResearchData ? 'Avg Impact Factor' : 'Avg Response Time'}
                </div>
              </div>
            </div>

            {/* Evidence strength bar — only if local DB has data */}
            {hasLocalResearchData && rs!.evidenceDistribution.length > 0 && (() => {
              const evidenceColors: Record<string, string> = {
                strong: 'bg-green-500', moderate: 'bg-blue-500',
                weak: 'bg-yellow-400', insufficient: 'bg-red-400', unknown: 'bg-gray-300',
              };
              const totalEv = rs!.evidenceDistribution.reduce((s, r) => s + r.count, 0);
              return (
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2">Evidence Strength Distribution</div>
                  <div className="flex h-6 rounded-lg overflow-hidden">
                    {rs!.evidenceDistribution.map(({ strength, count }) => {
                      const pct = totalEv > 0 ? (count / totalEv) * 100 : 0;
                      if (pct === 0) return null;
                      return (
                        <div
                          key={strength}
                          className={`${evidenceColors[strength] || 'bg-gray-300'} flex items-center justify-center text-white text-xs font-medium`}
                          style={{ width: `${pct}%` }}
                          title={`${strength}: ${Math.round(pct)}%`}
                        >
                          {pct >= 20 && `${strength}`}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 flex-wrap">
                    {rs!.evidenceDistribution.map(({ strength, count }) => {
                      const pct = totalEv > 0 ? Math.round((count / totalEv) * 100) : 0;
                      return (
                        <div key={strength} className="flex items-center gap-1 text-xs text-gray-600">
                          <div className={`w-2.5 h-2.5 rounded-sm ${evidenceColors[strength] || 'bg-gray-300'}`} />
                          <span className="capitalize">{strength}: {pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* PROMIS Patient Outcomes Panel */}
        {showPromisPanel && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Outcomes (PROMIS)</h2>
            <p className="text-sm text-gray-500 mb-6">Patient-reported physical function and pain interference scores tracked over time</p>

            {!hasPromisData ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-blue-600 font-semibold mb-1">Collecting outcome data</div>
                <p className="text-sm text-blue-500">
                  PROMIS assessments are collected after pain-related consultations. Data will populate as patients complete baseline questionnaires.
                </p>
              </div>
            ) : (
              <>
                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {ps!.baselineCaptureRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Baseline Capture Rate</div>
                    <div className="text-xs text-gray-400 mt-0.5">{ps!.baselineCaptureCount} of {ps!.totalConsultations} consults</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {ps!.avgBaselinePfScore !== null ? ps!.avgBaselinePfScore.toFixed(1) : '—'}
                    </div>
                    <div className="text-sm text-gray-600">Avg Physical Function</div>
                    <div className="text-xs text-gray-400 mt-0.5">T-score (higher = better)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-500 mb-1">
                      {ps!.avgBaselinePiScore !== null ? ps!.avgBaselinePiScore.toFixed(1) : '—'}
                    </div>
                    <div className="text-sm text-gray-600">Avg Pain Interference</div>
                    <div className="text-xs text-gray-400 mt-0.5">T-score (lower = better)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {ps!.totalWithFollowup > 0 ? `${ps!.clinicallyImprovedRate.toFixed(0)}%` : '—'}
                    </div>
                    <div className="text-sm text-gray-600">Clinically Improved</div>
                    <div className="text-xs text-gray-400 mt-0.5">≥5 T-score improvement</div>
                  </div>
                </div>

                {/* Follow-up completion funnel */}
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-3">Follow-up Completion Funnel</div>
                  {(() => {
                    const funnel = [
                      { label: 'Baseline', count: ps!.followUpCompletion.baseline, pct: 100 },
                      { label: '2-week', count: ps!.followUpCompletion.week2, pct: ps!.followUpRates.week2 },
                      { label: '4-week', count: ps!.followUpCompletion.week4, pct: ps!.followUpRates.week4 },
                      { label: '8-week', count: ps!.followUpCompletion.week8, pct: ps!.followUpRates.week8 },
                    ];
                    const colors = ['bg-purple-500', 'bg-purple-400', 'bg-purple-300', 'bg-purple-200'];
                    return (
                      <div className="space-y-2">
                        {funnel.map(({ label, count, pct }, i) => (
                          <div key={label} className="flex items-center gap-3">
                            <div className="w-16 text-xs text-gray-500 text-right">{label}</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                              <div
                                className={`${colors[i]} h-5 rounded-full flex items-center justify-end pr-2 transition-all`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              >
                                {pct >= 15 && (
                                  <span className="text-xs text-white font-semibold">{pct.toFixed(0)}%</span>
                                )}
                              </div>
                            </div>
                            <div className="w-12 text-xs text-gray-600 font-medium">{count}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* About Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About OrthoIQ</h2>
          <p className="text-gray-700 mb-4">
            OrthoIQ uses a multi-agent AI system where specialized agents collaborate to provide comprehensive orthopedic guidance. Each specialist contributes its expertise; their responses are synthesized into a single recommendation, with confidence and consensus tracked across consultations.
          </p>
          <p className="text-gray-700">
            User feedback, PROMIS milestone responses, and physician reviews feed back into the system to drive continuous improvement.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-6">
          <p>Statistics update in real-time based on consultation data and agent performance.</p>
          <p className="mt-2">
            <Link href={backHref} className="text-blue-600 hover:text-blue-800">
              ← Return to OrthoIQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
