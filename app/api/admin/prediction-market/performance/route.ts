import { NextRequest, NextResponse } from 'next/server';

const AGENTS_ENDPOINT = process.env.ORTHOIQ_AGENTS_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    // Proxy to orthoiq-agents backend for prediction market statistics
    const marketStatsResponse = await fetch(`${AGENTS_ENDPOINT}/predictions/market/statistics`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!marketStatsResponse.ok) {
      throw new Error(`Backend returned ${marketStatsResponse.status}`);
    }

    const rawResponse = await marketStatsResponse.json();
    // Backend returns data nested under 'statistics' key
    const marketStats = rawResponse.statistics || rawResponse;

    // Also get token statistics for additional context
    let tokenStats = null;
    try {
      const tokenResponse = await fetch(`${AGENTS_ENDPOINT}/tokens/statistics`, {
        signal: AbortSignal.timeout(5000)
      });
      if (tokenResponse.ok) {
        tokenStats = await tokenResponse.json();
      }
    } catch (tokenError) {
      console.warn('Could not fetch token statistics:', tokenError);
    }

    // Format agent leaderboard data
    // Backend returns averageAccuracy as percentage (0-100), convert to decimal (0-1)
    const topPerformers = (marketStats.topPerformers || marketStats.agents || []).map((agent: any, index: number) => {
      // Normalize accuracy - if > 1, it's a percentage, convert to decimal
      const rawAccuracy = agent.averageAccuracy || agent.accuracyRate || agent.accuracy || 0;
      const accuracyRate = rawAccuracy > 1 ? rawAccuracy / 100 : rawAccuracy;

      return {
        rank: index + 1,
        agentId: agent.agentId || agent.id,
        agentName: agent.agentName || agent.name || formatAgentName(agent.agentId || agent.id),
        accuracyRate,
        tokensEarned: agent.tokensEarned || agent.tokens || agent.netTokens || 0,
        totalPredictions: agent.totalPredictions || agent.predictions || 0,
        averageStake: agent.averageStake || agent.avgStake || 0,
        last7DaysAccuracy: agent.last7DaysAccuracy || agent.recentAccuracy || accuracyRate,
        trend: determineTrend(agent.last7DaysAccuracy, accuracyRate),
        participationRate: agent.participationRate || 0
      };
    });

    // Format prediction dimensions if available
    const predictionDimensions = marketStats.predictionDimensions || marketStats.dimensions || {
      pain: { totalPredictions: 0, accuracy: 0 },
      mobility: { totalPredictions: 0, accuracy: 0 },
      function: { totalPredictions: 0, accuracy: 0 }
    };

    // Normalize market-level accuracy
    const rawMarketAccuracy = marketStats.averageMarketAccuracy || marketStats.averageAccuracy || 0;
    const normalizedMarketAccuracy = rawMarketAccuracy > 1 ? rawMarketAccuracy / 100 : rawMarketAccuracy;

    return NextResponse.json({
      // Market Overview
      totalPredictions: marketStats.totalPredictions || 0,
      averageAccuracy: normalizedMarketAccuracy,
      totalTokensDistributed: marketStats.totalTokensDistributed || tokenStats?.totalTokens || 0,

      // Agent Leaderboard
      topPerformers,

      // Prediction Dimensions
      predictionDimensions,

      // Token Distribution (for pie chart)
      tokenDistribution: topPerformers.map((agent: any) => ({
        agentId: agent.agentId,
        agentName: agent.agentName,
        tokens: agent.tokensEarned,
        percentage: marketStats.totalTokensDistributed > 0
          ? (agent.tokensEarned / marketStats.totalTokensDistributed) * 100
          : 0
      })),

      // Recent trends (if available from backend)
      accuracyTrends: marketStats.accuracyTrends || [],

      // Metadata
      backendAvailable: true,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching prediction market performance:', error);

    // Return fallback response when backend is unavailable
    return NextResponse.json({
      totalPredictions: 0,
      averageAccuracy: 0,
      totalTokensDistributed: 0,
      topPerformers: [
        { rank: 1, agentId: 'triage', agentName: 'Triage', accuracyRate: 0, tokensEarned: 0, totalPredictions: 0, trend: 'stable' },
        { rank: 2, agentId: 'painWhisperer', agentName: 'Pain Whisperer', accuracyRate: 0, tokensEarned: 0, totalPredictions: 0, trend: 'stable' },
        { rank: 3, agentId: 'movementDetective', agentName: 'Movement Detective', accuracyRate: 0, tokensEarned: 0, totalPredictions: 0, trend: 'stable' },
        { rank: 4, agentId: 'strengthSage', agentName: 'Strength Sage', accuracyRate: 0, tokensEarned: 0, totalPredictions: 0, trend: 'stable' },
        { rank: 5, agentId: 'mindMender', agentName: 'Mind Mender', accuracyRate: 0, tokensEarned: 0, totalPredictions: 0, trend: 'stable' }
      ],
      predictionDimensions: {
        pain: { totalPredictions: 0, accuracy: 0 },
        mobility: { totalPredictions: 0, accuracy: 0 },
        function: { totalPredictions: 0, accuracy: 0 }
      },
      tokenDistribution: [],
      accuracyTrends: [],
      backendAvailable: false,
      error: 'orthoiq-agents backend unavailable',
      generatedAt: new Date().toISOString()
    });
  }
}

// Helper function to format agent ID to display name
function formatAgentName(agentId: string): string {
  const nameMap: Record<string, string> = {
    'triage': 'Triage',
    'painWhisperer': 'Pain Whisperer',
    'pain_whisperer': 'Pain Whisperer',
    'movementDetective': 'Movement Detective',
    'movement_detective': 'Movement Detective',
    'strengthSage': 'Strength Sage',
    'strength_sage': 'Strength Sage',
    'mindMender': 'Mind Mender',
    'mind_mender': 'Mind Mender'
  };
  return nameMap[agentId] || agentId.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

// Helper function to determine trend based on recent vs overall accuracy
function determineTrend(recentAccuracy?: number, overallAccuracy?: number): 'improving' | 'stable' | 'declining' {
  if (!recentAccuracy || !overallAccuracy) return 'stable';
  const diff = recentAccuracy - overallAccuracy;
  if (diff > 0.02) return 'improving';
  if (diff < -0.02) return 'declining';
  return 'stable';
}
