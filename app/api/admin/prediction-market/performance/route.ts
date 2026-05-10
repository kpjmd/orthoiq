import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

// The prediction market statistics endpoint was removed in the Phase 3 backend audit.
// This route returns a static empty response; the UI components will be removed in Task 3.
export async function GET(_request: NextRequest) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  return NextResponse.json({
    totalPredictions: 0,
    averageAccuracy: 0,
    totalTokensDistributed: 0,
    topPerformers: [],
    predictionDimensions: {
      pain: { totalPredictions: 0, accuracy: 0 },
      mobility: { totalPredictions: 0, accuracy: 0 },
      function: { totalPredictions: 0, accuracy: 0 }
    },
    tokenDistribution: [],
    accuracyTrends: [],
    backendAvailable: false,
    generatedAt: new Date().toISOString()
  });
}
