'use client';

import { useEffect, useState } from 'react';

interface PROMISData {
  totalConsultations: number;
  baselineCaptureCount: number;
  baselineCaptureRate: number;
  painInterferenceAssessed: number;
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
  physicalFunctionDistribution: Array<{ bucket: string; count: number }>;
  painInterferenceDistribution: Array<{ bucket: string; count: number }>;
  tScoreTrend: Array<{
    timepoint: string;
    avgPf: number | null;
    avgPi: number | null;
    count: number;
  }>;
  responsesLast7Days: number;
}

const PF_BUCKET_LABELS: Record<string, string> = {
  normal_or_above: 'Normal / Above',
  mild_limitation: 'Mild Limitation',
  moderate_limitation: 'Moderate Limitation',
  severe_limitation: 'Severe Limitation',
};

const PF_BUCKET_COLORS: Record<string, string> = {
  normal_or_above: 'bg-green-500',
  mild_limitation: 'bg-yellow-400',
  moderate_limitation: 'bg-orange-400',
  severe_limitation: 'bg-red-500',
};

const PI_BUCKET_LABELS: Record<string, string> = {
  not_assessed: 'Not Assessed',
  minimal: 'Minimal',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
};

const PI_BUCKET_COLORS: Record<string, string> = {
  not_assessed: 'bg-gray-300',
  minimal: 'bg-green-500',
  mild: 'bg-yellow-400',
  moderate: 'bg-orange-400',
  severe: 'bg-red-500',
};

const TIMEPOINT_LABELS: Record<string, string> = {
  baseline: 'Baseline',
  '2week': 'Week 2',
  '4week': 'Week 4',
  '8week': 'Week 8',
};

export function PROMISMetrics() {
  const [data, setData] = useState<PROMISData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/promis/metrics');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch PROMIS metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-gray-500">Failed to load PROMIS metrics</p>
      </div>
    );
  }

  const hasAnyData = data.baselineCaptureCount > 0;
  const funnelMax = data.followUpCompletion.baseline || 1;
  const funnelStages = [
    { label: 'Baseline', count: data.followUpCompletion.baseline, pct: 100 },
    { label: 'Week 2', count: data.followUpCompletion.week2, pct: data.followUpRates.week2 },
    { label: 'Week 4', count: data.followUpCompletion.week4, pct: data.followUpRates.week4 },
    { label: 'Week 8', count: data.followUpCompletion.week8, pct: data.followUpRates.week8 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">PROMIS Capture Rates</h2>
        <p className="text-sm text-gray-500">Patient-reported outcomes measurement</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Top metric cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-indigo-700">
              {data.baselineCaptureRate}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Baseline Capture</div>
            <div className="text-xs text-gray-400">{data.baselineCaptureCount} of {data.totalConsultations}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-purple-700">
              {data.painInterferenceAssessed}
            </div>
            <div className="text-xs text-gray-600 mt-1">Pain Interference</div>
            <div className="text-xs text-gray-400">Assessed</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-700">
              {data.responsesLast7Days}
            </div>
            <div className="text-xs text-gray-600 mt-1">7-Day Activity</div>
            <div className="text-xs text-gray-400">Responses</div>
          </div>
        </div>

        {!hasAnyData ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
            No PROMIS responses captured yet.
          </div>
        ) : (
          <>
            {/* Follow-up completion funnel */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Follow-up Completion</h3>
              <div className="space-y-2">
                {funnelStages.map((stage) => {
                  const widthPct = funnelMax > 0 ? (stage.count / funnelMax) * 100 : 0;
                  return (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-gray-600">{stage.label}</span>
                        <span className="font-semibold text-gray-900">
                          {stage.count} ({Math.round(stage.pct)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* T-Score distributions */}
            {(data.physicalFunctionDistribution.length > 0 || data.painInterferenceDistribution.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {/* Physical Function */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 mb-2">Physical Function (Baseline)</h3>
                  <div className="space-y-1.5">
                    {data.physicalFunctionDistribution.map((d) => {
                      const totalPf = data.physicalFunctionDistribution.reduce((s, r) => s + r.count, 0);
                      const pct = totalPf > 0 ? Math.round((d.count / totalPf) * 100) : 0;
                      return (
                        <div key={d.bucket} className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PF_BUCKET_COLORS[d.bucket] || 'bg-gray-400'}`} />
                          <span className="text-xs text-gray-600 flex-1 truncate">
                            {PF_BUCKET_LABELS[d.bucket] || d.bucket}
                          </span>
                          <span className="text-xs font-semibold text-gray-800">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pain Interference */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 mb-2">Pain Interference (Baseline)</h3>
                  <div className="space-y-1.5">
                    {data.painInterferenceDistribution.map((d) => {
                      const totalPi = data.painInterferenceDistribution.reduce((s, r) => s + r.count, 0);
                      const pct = totalPi > 0 ? Math.round((d.count / totalPi) * 100) : 0;
                      return (
                        <div key={d.bucket} className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PI_BUCKET_COLORS[d.bucket] || 'bg-gray-400'}`} />
                          <span className="text-xs text-gray-600 flex-1 truncate">
                            {PI_BUCKET_LABELS[d.bucket] || d.bucket}
                          </span>
                          <span className="text-xs font-semibold text-gray-800">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* T-score trend by timepoint */}
            {data.tScoreTrend.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-700 mb-3">Average T-Scores by Timepoint</h3>
                <div className="space-y-2">
                  {data.tScoreTrend.map((row) => (
                    <div key={row.timepoint} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 w-16">{TIMEPOINT_LABELS[row.timepoint] || row.timepoint}</span>
                      <span className="text-indigo-700 font-semibold">
                        PF: {row.avgPf !== null ? row.avgPf : '—'}
                      </span>
                      <span className="text-purple-700 font-semibold">
                        PI: {row.avgPi !== null ? row.avgPi : '—'}
                      </span>
                      <span className="text-gray-400">n={row.count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">PF higher = better function · PI higher = worse pain</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
