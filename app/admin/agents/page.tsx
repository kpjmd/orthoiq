'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AgentSummary {
  rank: number;
  agentId: string;
  agentName: string;
  accuracyRate: number;
  tokensEarned: number;
  totalPredictions: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface AgentsData {
  topPerformers: AgentSummary[];
  totalPredictions: number;
  averageAccuracy: number;
  backendAvailable: boolean;
}

export default function AgentsPage() {
  const [data, setData] = useState<AgentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/admin/prediction-market/performance');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Agent Network</h1>
            <p className="text-lg opacity-90">Loading agents...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Agent Network</h1>
              <p className="text-lg opacity-90">AI Specialist Performance Overview</p>
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
        {data && !data.backendAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            Agent statistics unavailable. orthoiq-agents backend may be offline.
          </div>
        )}

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="text-3xl font-bold text-gray-900">{data.topPerformers?.length || 0}</div>
              <div className="text-sm text-gray-600">Active Agents</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{data.totalPredictions || 0}</div>
              <div className="text-sm text-gray-600">Total Predictions</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="text-3xl font-bold text-green-600">
                {data.averageAccuracy ? `${Math.round(data.averageAccuracy * 100)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Network Accuracy</div>
            </div>
          </div>
        )}

        {/* Agent List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">All Agents</h2>
          </div>
          <div className="divide-y">
            {data?.topPerformers?.map((agent) => (
              <Link
                key={agent.agentId}
                href={`/admin/agents/${agent.agentId}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl font-bold text-gray-300">#{agent.rank}</span>
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">{agent.agentName}</div>
                      <div className="text-sm text-gray-500">{agent.totalPredictions} predictions</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600">
                        {Math.round(agent.accuracyRate * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">accuracy</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-600">{agent.tokensEarned}</div>
                      <div className="text-xs text-gray-500">tokens</div>
                    </div>
                    <div className={`flex items-center ${getTrendColor(agent.trend)}`}>
                      <span className="text-lg">{getTrendIcon(agent.trend)}</span>
                      <span className="text-sm ml-1">{agent.trend}</span>
                    </div>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${agent.accuracyRate * 100}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
            {(!data?.topPerformers || data.topPerformers.length === 0) && (
              <div className="p-6 text-center text-gray-500">
                No agents available. The prediction market may not have started yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
