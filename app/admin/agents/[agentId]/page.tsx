'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface AgentDetailData {
  agentId: string;
  agentName: string;
  specialization?: string;
  description?: string;
  totalPredictions: number;
  accuracyRate: number;
  tokensEarned: number;
  tokensStaked?: number;
  averageStakePerPrediction?: number;
  netTokenGain?: number;
  averageConfidence?: number;
  calibrationScore?: number;
  last7DaysAccuracy?: number;
  last30DaysAccuracy?: number;
  trend?: 'improving' | 'stable' | 'declining';
  accuracyOverTime?: Array<{ date: string; accuracy: number }>;
  tokenBalanceHistory?: Array<{ date: string; balance: number }>;
  byDimension?: {
    [key: string]: { predictions: number; accuracy: number };
  };
  recentCases?: Array<{
    caseId: string;
    prediction: string;
    stake: number;
    outcome?: 'accurate' | 'inaccurate' | 'pending';
  }>;
  backendAvailable: boolean;
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const [data, setData] = useState<AgentDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgentDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch agent details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails();
    }
  }, [agentId, fetchAgentDetails]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Agent Details</h1>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Agent Not Found</h1>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <p className="text-gray-500">Agent details not available</p>
            <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend?: string) => {
    if (trend === 'improving') return '↑';
    if (trend === 'declining') return '↓';
    return '→';
  };

  const getTrendColor = (trend?: string) => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{data.agentName}</h1>
              <p className="text-lg opacity-90">{data.specialization || 'AI Specialist Agent'}</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {!data.backendAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            ⚠️ Agent statistics unavailable. orthoiq-agents backend may be offline. Showing limited data.
          </div>
        )}

        {/* Overview Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Predictions</div>
              <div className="text-2xl font-bold text-gray-900">{data.totalPredictions || 0}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Accuracy Rate</div>
              <div className="text-2xl font-bold text-blue-600">
                {data.accuracyRate ? `${Math.round(data.accuracyRate * 100)}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Tokens Earned</div>
              <div className="text-2xl font-bold text-green-600">{data.tokensEarned || 0}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Trend</div>
              <div className={`text-2xl font-bold ${getTrendColor(data.trend)}`}>
                {getTrendIcon(data.trend)} {data.trend || 'stable'}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        {data.backendAvailable && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accuracy Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accuracy Breakdown</h3>
              <div className="space-y-3">
                {data.last7DaysAccuracy !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last 7 Days:</span>
                    <span className="font-semibold text-gray-900">
                      {Math.round(data.last7DaysAccuracy * 100)}%
                    </span>
                  </div>
                )}
                {data.last30DaysAccuracy !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last 30 Days:</span>
                    <span className="font-semibold text-gray-900">
                      {Math.round(data.last30DaysAccuracy * 100)}%
                    </span>
                  </div>
                )}
                {data.averageConfidence !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Confidence:</span>
                    <span className="font-semibold text-gray-900">
                      {Math.round(data.averageConfidence * 100)}%
                    </span>
                  </div>
                )}
                {data.calibrationScore !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Calibration Score:</span>
                    <span className="font-semibold text-gray-900">
                      {data.calibrationScore.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Token Economics */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Economics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tokens Earned:</span>
                  <span className="font-semibold text-green-600">{data.tokensEarned || 0}</span>
                </div>
                {data.tokensStaked !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tokens Staked:</span>
                    <span className="font-semibold text-gray-900">{data.tokensStaked}</span>
                  </div>
                )}
                {data.averageStakePerPrediction !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Stake/Prediction:</span>
                    <span className="font-semibold text-gray-900">
                      {data.averageStakePerPrediction.toFixed(1)}
                    </span>
                  </div>
                )}
                {data.netTokenGain !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Net Gain:</span>
                    <span className={`font-semibold ${data.netTokenGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.netTokenGain >= 0 ? '+' : ''}{data.netTokenGain}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prediction Specialization */}
        {data.byDimension && Object.keys(data.byDimension).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prediction Specialization</h3>
            <div className="space-y-3">
              {Object.entries(data.byDimension).map(([dimension, stats]) => (
                <div key={dimension}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {dimension.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {stats.predictions} predictions • {Math.round(stats.accuracy * 100)}% accuracy
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stats.accuracy * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Cases */}
        {data.recentCases && data.recentCases.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Consultations</h3>
            <div className="space-y-3">
              {data.recentCases.map((case_, idx) => (
                <div key={idx} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Case #{case_.caseId}</span>
                    <p className="text-xs text-gray-600">{case_.prediction}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-600">{case_.stake} tokens</span>
                    {case_.outcome && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        case_.outcome === 'accurate'
                          ? 'bg-green-100 text-green-800'
                          : case_.outcome === 'inaccurate'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {case_.outcome}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Agent Description</h3>
            <p className="text-gray-700">{data.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
