'use client';

import { useEffect, useState } from 'react';

interface QueryTypeTotals {
  query_type: string;
  count: number;
  avg_cost: number;
  avg_specialists: number;
  avg_time: number;
}

interface TrendPoint {
  date: string;
  query_type: string;
  count: number;
}

interface RecentQuery {
  consultationId: string;
  querySubtype: string | null;
  createdAt: string;
  question: string | null;
}

interface QueryTypeMetrics {
  totals: QueryTypeTotals[];
  trend: TrendPoint[];
  recentInformational: RecentQuery[];
}

export function QueryTypeAnalytics() {
  const [metrics, setMetrics] = useState<QueryTypeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/query-type/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch query type metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
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

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-gray-500">Failed to load query type analytics</p>
      </div>
    );
  }

  const clinical = metrics.totals.find(t => t.query_type === 'clinical');
  const informational = metrics.totals.find(t => t.query_type === 'informational');
  const totalCount = (clinical?.count || 0) + (informational?.count || 0);

  // Not enough data yet
  if (totalCount < 5) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="px-0 py-0">
          <h2 className="text-xl font-bold text-gray-900">Query Pathway Analytics</h2>
          <p className="text-sm text-gray-500">Clinical vs informational query routing</p>
        </div>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-blue-600 font-semibold mb-1">Collecting query classification data...</div>
          <p className="text-sm text-blue-500">
            Query type tracking is active. Analytics will appear once enough consultations have been classified.
          </p>
          {totalCount > 0 && (
            <p className="text-xs text-blue-400 mt-2">{totalCount} classified so far</p>
          )}
        </div>
      </div>
    );
  }

  const clinicalPct = totalCount > 0 ? ((clinical?.count || 0) / totalCount) * 100 : 0;
  const informationalPct = totalCount > 0 ? ((informational?.count || 0) / totalCount) * 100 : 0;

  // Build 30-day trend data
  const trendByDate = new Map<string, { clinical: number; informational: number }>();
  for (const point of metrics.trend) {
    const existing = trendByDate.get(point.date) || { clinical: 0, informational: 0 };
    if (point.query_type === 'clinical') existing.clinical = point.count;
    else if (point.query_type === 'informational') existing.informational = point.count;
    trendByDate.set(point.date, existing);
  }
  const trendDates = Array.from(trendByDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDayCount = Math.max(...trendDates.map(([, v]) => v.clinical + v.informational), 1);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">Query Pathway Analytics</h2>
        <p className="text-sm text-gray-500">Clinical vs informational query routing</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Proportional split bar */}
        <div>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {clinicalPct > 0 && (
              <div
                className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${clinicalPct}%` }}
                title={`Clinical: ${clinical?.count || 0} (${clinicalPct.toFixed(1)}%)`}
              >
                {clinicalPct >= 15 && `Clinical ${clinicalPct.toFixed(1)}%`}
              </div>
            )}
            {informationalPct > 0 && (
              <div
                className="bg-teal-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${informationalPct}%` }}
                title={`Informational: ${informational?.count || 0} (${informationalPct.toFixed(1)}%)`}
              >
                {informationalPct >= 15 && `Informational ${informationalPct.toFixed(1)}%`}
              </div>
            )}
          </div>
          <div className="flex justify-between mt-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              Clinical ({clinical?.count || 0})
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-2.5 h-2.5 rounded-sm bg-teal-500" />
              Informational ({informational?.count || 0})
            </div>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{clinical?.count || 0}</div>
            <div className="text-xs text-blue-600">Clinical Queries</div>
          </div>
          <div className="bg-teal-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-teal-700">{informational?.count || 0}</div>
            <div className="text-xs text-teal-600">Informational Queries</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">
              ${(clinical?.avg_cost || 0).toFixed(3)}
            </div>
            <div className="text-xs text-blue-600">Avg Cost (Clinical)</div>
          </div>
          <div className="bg-teal-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-teal-700">
              ${(informational?.avg_cost || 0).toFixed(3)}
            </div>
            <div className="text-xs text-teal-600">Avg Cost (Informational)</div>
          </div>
        </div>

        {/* 30-day trend */}
        {trendDates.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">30-Day Trend</h3>
            <div className="h-32 flex items-end space-x-1">
              {trendDates.map(([date, counts]) => {
                const total = counts.clinical + counts.informational;
                const height = (total / maxDayCount) * 100;
                const clinicalH = total > 0 ? (counts.clinical / total) * height : 0;
                const infoH = total > 0 ? (counts.informational / total) * height : 0;
                return (
                  <div
                    key={date}
                    className="flex-1 flex flex-col justify-end cursor-pointer"
                    title={`${date}: ${counts.clinical} clinical, ${counts.informational} informational`}
                  >
                    <div
                      className="bg-teal-400 rounded-t-sm hover:bg-teal-500 transition-colors"
                      style={{ height: `${infoH}%`, minHeight: counts.informational > 0 ? '2px' : '0' }}
                    />
                    <div
                      className="bg-blue-500 hover:bg-blue-600 transition-colors"
                      style={{ height: `${clinicalH}%`, minHeight: counts.clinical > 0 ? '2px' : '0' }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Clinical
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-sm bg-teal-400" /> Informational
              </div>
            </div>
          </div>
        )}

        {/* Recent informational queries */}
        {metrics.recentInformational.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Informational Queries</h3>
            <div className="space-y-2">
              {metrics.recentInformational.map((q) => (
                <div key={q.consultationId} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-gray-700 truncate flex-1">
                    {q.question || q.consultationId}
                  </span>
                  {q.querySubtype && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      q.querySubtype === 'factual'
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {q.querySubtype}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
