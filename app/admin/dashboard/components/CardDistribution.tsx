'use client';

import { useEffect, useState } from 'react';

interface TierData {
  count: number;
  percentage: number;
  avgSpecialists: number;
  avgConsensus: number;
}

interface CardDistributionData {
  total: number;
  byTier: {
    standard: TierData;
    complete: TierData;
    verified: TierData;
    exceptional: TierData;
  };
  averageSpecialistsPerCard: number;
  cardsAwaitingMDReview: number;
  cardsAwaitingValidation: number;
  recentUpgrades: number;
  publicCards: number;
  privateCards: number;
  qrScansThisWeek: number;
}

export function CardDistribution() {
  const [data, setData] = useState<CardDistributionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/cards/distribution');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch card distribution:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-gray-500">Failed to load card distribution</p>
      </div>
    );
  }

  const tierColors = {
    standard: 'bg-gray-400',
    complete: 'bg-blue-500',
    verified: 'bg-purple-500',
    exceptional: 'bg-yellow-500'
  };

  const tierLabels = {
    standard: 'Standard',
    complete: 'Complete',
    verified: 'Verified',
    exceptional: 'Exceptional'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">Intelligence Card Distribution</h2>
        <p className="text-sm text-gray-500">Tier breakdown and quality metrics</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Tier Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Tier Breakdown (Total: {data.total.toLocaleString()} cards)
          </h3>

          {/* Visual Bar Chart */}
          <div className="mb-4">
            <div className="flex h-8 rounded-lg overflow-hidden">
              {Object.entries(data.byTier).map(([tier, tierData]) => {
                if (tierData.percentage === 0) return null;
                return (
                  <div
                    key={tier}
                    className={`${tierColors[tier as keyof typeof tierColors]} flex items-center justify-center text-white text-xs font-medium`}
                    style={{ width: `${tierData.percentage}%` }}
                    title={`${tierLabels[tier as keyof typeof tierLabels]}: ${tierData.count} (${tierData.percentage}%)`}
                  >
                    {tierData.percentage >= 10 && `${Math.round(tierData.percentage)}%`}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tier Details */}
          <div className="space-y-2">
            {Object.entries(data.byTier).map(([tier, tierData]) => (
              <div key={tier} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded ${tierColors[tier as keyof typeof tierColors]}`} />
                  <span className="font-medium text-gray-700">
                    {tierLabels[tier as keyof typeof tierLabels]}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-gray-600">
                  <span>{tierData.count.toLocaleString()}</span>
                  <span className="text-gray-400">|</span>
                  <span>{tierData.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Metrics */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quality Metrics by Tier</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="pb-2">Tier</th>
                  <th className="pb-2">Avg Specialists</th>
                  <th className="pb-2">Avg Consensus</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {Object.entries(data.byTier).map(([tier, tierData]) => (
                  <tr key={tier} className="border-b">
                    <td className="py-2 font-medium">{tierLabels[tier as keyof typeof tierLabels]}</td>
                    <td className="py-2">{tierData.avgSpecialists.toFixed(1)}</td>
                    <td className="py-2">{tierData.avgConsensus}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upgrade Pipeline */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Upgrade Pipeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Complete → Verified (awaiting MD):</span>
              <span className="font-semibold text-gray-900">{data.cardsAwaitingMDReview}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Verified → Exceptional (validation):</span>
              <span className="font-semibold text-gray-900">{data.cardsAwaitingValidation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recent upgrades (7 days):</span>
              <span className="font-semibold text-green-600">{data.recentUpgrades}</span>
            </div>
          </div>
        </div>

        {/* Privacy & Sharing */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Privacy & Sharing</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-600 mb-1">Public Cards</div>
              <div className="text-xl font-bold text-gray-900">
                {data.publicCards.toLocaleString()}
                <span className="text-sm text-gray-500 ml-2">
                  ({data.total > 0 ? Math.round((data.publicCards / data.total) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-600 mb-1">Private Cards</div>
              <div className="text-xl font-bold text-gray-900">
                {data.privateCards.toLocaleString()}
                <span className="text-sm text-gray-500 ml-2">
                  ({data.total > 0 ? Math.round((data.privateCards / data.total) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            QR scans this week: {data.qrScansThisWeek.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
