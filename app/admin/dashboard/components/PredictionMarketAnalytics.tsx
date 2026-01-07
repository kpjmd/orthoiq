'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AgentPerformance {
  agentId: string;
  agentName: string;
  accuracyRate: number;
  tokensEarned: number;
  totalPredictions: number;
  last7DaysAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  averageStakePerPrediction?: number;
}

interface PredictionMarketData {
  totalPredictions: number;
  averageAccuracy: number;
  totalTokensDistributed: number;
  topPerformers: AgentPerformance[];
}

export function PredictionMarketAnalytics() {
  const [data, setData] = useState<PredictionMarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/prediction-market/performance');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch prediction market data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Prediction Market Analytics</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          ⚠️ Unable to fetch prediction market data. orthoiq-agents backend may be offline.
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '↑';
    if (trend === 'declining') return '↓';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">Prediction Market Analytics</h2>
        <p className="text-sm text-gray-500">Agent performance and token economics</p>
      </div>

      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{data.totalPredictions.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Total Predictions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Math.round(data.averageAccuracy * 100)}%</div>
            <div className="text-xs text-gray-500">Avg Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{data.totalTokensDistributed.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Tokens Distributed</div>
          </div>
        </div>

        {/* Agent Leaderboard */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Agent Leaderboard (by Accuracy)</h3>
          <div className="space-y-3">
            {data.topPerformers.slice(0, 5).map((agent, index) => (
              <Link
                key={agent.agentId}
                href={`/admin/agents/${agent.agentId}`}
                className="block border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <span className="font-semibold text-gray-900">{agent.agentName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getTrendColor(agent.trend)}`}>
                      {getTrendIcon(agent.trend)} {agent.trend}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${agent.accuracyRate * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{Math.round(agent.accuracyRate * 100)}% accuracy</span>
                  <span>{agent.tokensEarned} tokens earned</span>
                  <span>{agent.totalPredictions} predictions</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* View All Link */}
        <div className="mt-4 text-center">
          <Link
            href="/admin/agents"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Agents →
          </Link>
        </div>
      </div>
    </div>
  );
}
