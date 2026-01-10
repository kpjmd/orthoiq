'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PublicStats {
  totalConsultations: number;
  averageAgents: number;
  averageConsensus: number;
  topAgents: Array<{
    agentId: string;
    agentName: string;
    accuracyRate: number;
    tokensEarned: number;
    totalPredictions: number;
  }>;
  cardDistribution: {
    standard: number;
    complete: number;
    verified: number;
    exceptional: number;
  };
  networkStats: {
    totalPredictions: number;
    averageAccuracy: number;
    totalTokensDistributed: number;
  };
}

export default function PublicStatsPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch from multiple endpoints and combine
      const [overviewRes, marketRes, cardsRes] = await Promise.all([
        fetch('/api/admin/metrics/overview'),
        fetch('/api/admin/prediction-market/performance'),
        fetch('/api/admin/cards/distribution')
      ]);

      const [overview, market, cards] = await Promise.all([
        overviewRes.ok ? overviewRes.json() : null,
        marketRes.ok ? marketRes.json() : null,
        cardsRes.ok ? cardsRes.json() : null
      ]);

      setStats({
        totalConsultations: overview?.totalConsultations || 0,
        averageAgents: overview?.averageAgentsPerConsultation || 0,
        averageConsensus: overview?.averageMDApprovalRate || 0,
        topAgents: market?.topPerformers?.slice(0, 5) || [],
        cardDistribution: {
          standard: cards?.byTier?.standard?.count || 0,
          complete: cards?.byTier?.complete?.count || 0,
          verified: cards?.byTier?.verified?.count || 0,
          exceptional: cards?.byTier?.exceptional?.count || 0
        },
        networkStats: {
          totalPredictions: market?.totalPredictions || 0,
          averageAccuracy: market?.averageAccuracy || 0,
          totalTokensDistributed: market?.totalTokensDistributed || 0
        }
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

  const tierColors = {
    standard: 'bg-gray-400',
    complete: 'bg-blue-500',
    verified: 'bg-purple-500',
    exceptional: 'bg-yellow-500'
  };

  const totalCards = Object.values(stats.cardDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-purple-600 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <Link
              href="/miniapp"
              className="inline-flex items-center px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-sm transition-colors"
            >
              ← Back to App
            </Link>
            <div className="w-24"></div> {/* Spacer for centering */}
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

        {/* Agent Leaderboard */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Agent Leaderboard</h2>
          {stats.topAgents.length === 0 ? (
            <p className="text-gray-500 text-center">No agent data available</p>
          ) : (
            <div className="space-y-4">
              {stats.topAgents.map((agent, index) => (
                <div key={agent.agentId} className="flex items-center space-x-4 border-b pb-4">
                  <div className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">{agent.agentName}</div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{Math.round(agent.accuracyRate * 100)}% accuracy</span>
                      <span>•</span>
                      <span>{agent.tokensEarned} tokens earned</span>
                      <span>•</span>
                      <span>{agent.totalPredictions} predictions</span>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${agent.accuracyRate * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Intelligence Card Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Intelligence Card Distribution</h2>
          <div className="mb-6">
            <div className="flex h-10 rounded-lg overflow-hidden">
              {Object.entries(stats.cardDistribution).map(([tier, count]) => {
                const percentage = totalCards > 0 ? (count / totalCards) * 100 : 0;
                if (percentage === 0) return null;
                return (
                  <div
                    key={tier}
                    className={`${tierColors[tier as keyof typeof tierColors]} flex items-center justify-center text-white text-sm font-medium`}
                    style={{ width: `${percentage}%` }}
                    title={`${tier}: ${count} (${percentage.toFixed(1)}%)`}
                  >
                    {percentage >= 15 && `${Math.round(percentage)}%`}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.cardDistribution).map(([tier, count]) => (
              <div key={tier} className="text-center">
                <div className={`w-12 h-12 rounded-full ${tierColors[tier as keyof typeof tierColors]} mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                  {count}
                </div>
                <div className="text-sm font-medium text-gray-900 capitalize">
                  {tier}
                </div>
                <div className="text-xs text-gray-500">
                  {totalCards > 0 ? `${Math.round((count / totalCards) * 100)}%` : '0%'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prediction Market Stats */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Prediction Market Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stats.networkStats.totalPredictions.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Predictions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {Math.round(stats.networkStats.averageAccuracy * 100)}%
              </div>
              <div className="text-sm text-gray-600">Average Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stats.networkStats.totalTokensDistributed.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Tokens Distributed</div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About OrthoIQ</h2>
          <p className="text-gray-700 mb-4">
            OrthoIQ uses a multi-agent AI system where specialized agents collaborate to provide comprehensive orthopedic guidance. Each agent makes predictions about recovery outcomes, and these predictions are tracked through a transparent token economy system.
          </p>
          <p className="text-gray-700">
            Agents earn tokens when their predictions are accurate, creating a competitive environment that drives continuous improvement in prediction quality and patient outcomes.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-6">
          <p>Statistics update in real-time based on consultation data and agent performance.</p>
          <p className="mt-2">
            <Link href="/miniapp" className="text-blue-600 hover:text-blue-800">
              ← Return to OrthoIQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
