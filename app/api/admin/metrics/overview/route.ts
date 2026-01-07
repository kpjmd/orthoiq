import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const AGENTS_ENDPOINT = process.env.ORTHOIQ_AGENTS_URL || 'http://localhost:3000';

function getSql() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database URL not configured');
  }
  return neon(databaseUrl);
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();

    // Query local database for consultation metrics
    const [
      totalConsultations,
      consultationsToday,
      consultationsThisWeek,
      lastWeekConsultations,
      avgMetrics,
      userFeedbackStats,
      validationStats
    ] = await Promise.all([
      // Total consultations
      sql`SELECT COUNT(*) as count FROM consultations`,

      // Consultations today
      sql`SELECT COUNT(*) as count FROM consultations
          WHERE created_at >= CURRENT_DATE`,

      // Consultations this week
      sql`SELECT COUNT(*) as count FROM consultations
          WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`,

      // Consultations last week (for WoW growth)
      sql`SELECT COUNT(*) as count FROM consultations
          WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
            AND created_at < CURRENT_DATE - INTERVAL '7 days'`,

      // Average metrics
      sql`SELECT
            AVG(specialist_count) as avg_specialists,
            AVG(CASE WHEN md_approved = true THEN 1 ELSE 0 END) as approval_rate
          FROM consultations
          WHERE specialist_count > 0`,

      // User satisfaction from feedback
      sql`SELECT
            COUNT(*) as total_feedback,
            AVG(user_satisfaction) as avg_satisfaction
          FROM consultation_feedback
          WHERE user_satisfaction IS NOT NULL`,

      // Validation stats from milestones
      sql`SELECT
            COUNT(DISTINCT consultation_id) as validated_cases
          FROM feedback_milestones`
    ]);

    // Calculate week-over-week growth
    const thisWeekCount = Number(consultationsThisWeek[0]?.count || 0);
    const lastWeekCount = Number(lastWeekConsultations[0]?.count || 0);
    const weekOverWeekGrowth = lastWeekCount > 0
      ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
      : 0;

    // Calculate validation rate
    const totalCount = Number(totalConsultations[0]?.count || 0);
    const validatedCount = Number(validationStats[0]?.validated_cases || 0);
    const outcomeValidationRate = totalCount > 0 ? validatedCount / totalCount : 0;

    // Try to get agent statistics from orthoiq-agents backend
    let agentStats = {
      totalTokensIssued: 0,
      tokensInCirculation: 0,
      averageStakePerConsultation: 0,
      totalAgentInvocations: 0,
      agentStatsAvailable: false
    };

    try {
      const tokenResponse = await fetch(`${AGENTS_ENDPOINT}/tokens/statistics`, {
        signal: AbortSignal.timeout(5000)
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        agentStats = {
          totalTokensIssued: tokenData.totalTokensIssued || tokenData.totalTokens || 0,
          tokensInCirculation: tokenData.tokensInCirculation || tokenData.totalTokens || 0,
          averageStakePerConsultation: tokenData.averageStakePerConsultation || 0,
          totalAgentInvocations: tokenData.totalInvocations || 0,
          agentStatsAvailable: true
        };
      }
    } catch (error) {
      console.warn('orthoiq-agents backend unavailable for token statistics:', error);
    }

    // Get 30-day consultation trend for chart
    const consultationTrend = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM consultations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return NextResponse.json({
      // Consultation Volume
      totalConsultations: Number(totalConsultations[0]?.count || 0),
      consultationsToday: Number(consultationsToday[0]?.count || 0),
      consultationsThisWeek: thisWeekCount,
      weekOverWeekGrowth: Math.round(weekOverWeekGrowth * 10) / 10,

      // Agent Activity
      averageAgentsPerConsultation: Number(avgMetrics[0]?.avg_specialists || 0).toFixed(1),
      totalAgentInvocations: agentStats.totalAgentInvocations,

      // Quality Indicators
      averageMDApprovalRate: Number(avgMetrics[0]?.approval_rate || 0),
      averageUserSatisfaction: Number(userFeedbackStats[0]?.avg_satisfaction || 0).toFixed(1),
      outcomeValidationRate: Math.round(outcomeValidationRate * 100) / 100,

      // Token Economics
      totalTokensIssued: agentStats.totalTokensIssued,
      tokensInCirculation: agentStats.tokensInCirculation,
      averageStakePerConsultation: agentStats.averageStakePerConsultation,

      // Chart Data
      consultationTrend: consultationTrend.map(row => ({
        date: row.date,
        count: Number(row.count)
      })),

      // Metadata
      agentStatsAvailable: agentStats.agentStatsAvailable,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching admin metrics overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics overview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
