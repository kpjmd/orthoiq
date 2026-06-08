'use client';

import { useEffect, useState } from 'react';
import { DivergenceRecord } from '@/lib/types';
import type { DivergenceStats } from '@/lib/database';
import { DivergenceFeedCard } from '@/components/divergence/DivergenceFeedCard';

export function InterAgentDivergences() {
  const [recent, setRecent] = useState<DivergenceRecord[] | null>(null);
  const [stats, setStats] = useState<DivergenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    try {
      const [recentRes, statsRes] = await Promise.all([
        fetch('/api/admin/divergences/recent'),
        fetch('/api/admin/divergences/stats'),
      ]);
      if (recentRes.ok) setRecent((await recentRes.json()).divergences || []);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch divergences:', error);
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
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalDivergences = stats?.totalDivergences ?? 0;
  const hasData = totalDivergences > 0 || (recent?.length ?? 0) > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Inter-Agent Divergences</h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            ⚖️ High-signal
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Rare, gated events where the specialist panel genuinely disagrees on a contested clinical decision and deliberates
        </p>
      </div>

      {!hasData ? (
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <div className="text-amber-700 font-semibold mb-1">No divergences yet</div>
            <p className="text-sm text-amber-600">
              The gate fires only on true clinical equipoise (~1 in 6 consults). Divergences will appear here as the panel surfaces genuine debates.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Stat strip */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {(stats.gateOpenRateClinical * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-blue-600">Gate-open rate (clinical)</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {(stats.gateOpenRate * 100).toFixed(1)}% of all consults
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{stats.persistedCount}</div>
                <div className="text-xs text-amber-600">Persisted (equipoise held)</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {(stats.persistedRate * 100).toFixed(0)}% of divergences
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{stats.resolvedCount}</div>
                <div className="text-xs text-green-600">Converged after deliberation</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-700">{stats.totalDivergences}</div>
                <div className="text-xs text-gray-600">Total divergences</div>
              </div>
            </div>
          )}

          {/* Persisted vs resolved split bar */}
          {stats && stats.totalDivergences > 0 && (() => {
            const total = stats.persistedCount + stats.resolvedCount;
            if (total === 0) return null;
            const persistedPct = (stats.persistedCount / total) * 100;
            const resolvedPct = (stats.resolvedCount / total) * 100;
            return (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Persisted vs converged</div>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {persistedPct > 0 && (
                    <div
                      className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${persistedPct}%` }}
                      title={`Persisted: ${stats.persistedCount} (${persistedPct.toFixed(1)}%)`}
                    >
                      {persistedPct >= 15 && `Persisted ${persistedPct.toFixed(0)}%`}
                    </div>
                  )}
                  {resolvedPct > 0 && (
                    <div
                      className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${resolvedPct}%` }}
                      title={`Converged: ${stats.resolvedCount} (${resolvedPct.toFixed(1)}%)`}
                    >
                      {resolvedPct >= 15 && `Converged ${resolvedPct.toFixed(0)}%`}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Deliberation intensity (changed_count distribution) */}
          {stats && stats.changedCountDistribution.length > 0 && (() => {
            const maxCount = Math.max(...stats.changedCountDistribution.map((d) => d.count), 1);
            return (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  Deliberation intensity (specialists who revised)
                </div>
                <div className="space-y-2">
                  {stats.changedCountDistribution.map((d) => (
                    <div key={d.changedCount} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-gray-500 text-right">
                        {d.changedCount} revised
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-4 rounded-full"
                          style={{ width: `${(d.count / maxCount) * 100}%`, minWidth: d.count > 0 ? '4px' : '0' }}
                        />
                      </div>
                      <div className="w-8 text-xs text-gray-600 font-medium">{d.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Recurring contested decisions */}
          {stats && stats.contestedDecisions.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">Most contested decisions</div>
              <div className="space-y-2">
                {stats.contestedDecisions.slice(0, 8).map((d) => (
                  <div
                    key={d.decisionPointId || d.decisionQuestion}
                    className="flex items-center justify-between gap-3 text-sm border-b border-gray-100 pb-2"
                  >
                    <span className="text-gray-700 truncate flex-1">{d.decisionQuestion}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.persistedCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                          {d.persistedCount} persisted
                        </span>
                      )}
                      <span className="text-xs text-gray-500 font-medium">{d.count}×</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-specialist revision frequency (movable vs anchor) */}
          {stats && stats.specialistRevision.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">
                Specialist revision frequency
                <span className="text-xs font-normal text-gray-400"> — movable vs anchor</span>
              </div>
              <div className="space-y-2">
                {stats.specialistRevision.map((s) => (
                  <div key={s.specialist} className="flex items-center gap-3">
                    <div className="w-40 text-xs text-gray-600 truncate text-right">{s.specialist}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-purple-500 h-4 rounded-full"
                        style={{ width: `${s.revisionRate * 100}%`, minWidth: s.revised > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <div className="w-24 text-xs text-gray-500">
                      {(s.revisionRate * 100).toFixed(0)}% ({s.revised}/{s.total})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent feed */}
          {recent && recent.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">Recent divergences</div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recent.map((d, i) => (
                  <DivergenceFeedCard key={d.id ?? `${d.consultationId}-${i}`} record={d} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
