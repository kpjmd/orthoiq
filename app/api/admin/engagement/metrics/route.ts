import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

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

    // Get total consultations
    const totalResult = await sql`SELECT COUNT(*) as count FROM consultations`;
    const totalConsultations = Number(totalResult[0]?.count || 0);

    // Get milestone validations by week
    const milestoneStats = await sql`
      SELECT
        milestone_day,
        COUNT(*) as count
      FROM feedback_milestones
      GROUP BY milestone_day
      ORDER BY milestone_day
    `;

    // Map milestone days to weeks (14 = week 2, 28 = week 4, 56 = week 8)
    const week2Validations = milestoneStats.find(m => m.milestone_day === 14)?.count || 0;
    const week4Validations = milestoneStats.find(m => m.milestone_day === 28)?.count || 0;
    const week8Validations = milestoneStats.find(m => m.milestone_day === 56)?.count || 0;

    // Get unique validated cases
    const validatedCasesResult = await sql`
      SELECT COUNT(DISTINCT consultation_id) as count
      FROM feedback_milestones
    `;
    const validatedCases = Number(validatedCasesResult[0]?.count || 0);

    // Calculate validation rate
    const overallValidationRate = totalConsultations > 0
      ? validatedCases / totalConsultations
      : 0;

    // Get return visit metrics from tracking_page_views (if table exists)
    let returnVisitStats = {
      averageVisitsPerCase: 0,
      casesWithMultipleVisits: 0,
      percentageReturning: 0
    };

    try {
      const visitStats = await sql`
        SELECT
          consultation_id,
          COUNT(*) as visit_count
        FROM tracking_page_views
        GROUP BY consultation_id
      `;

      if (visitStats.length > 0) {
        const totalVisits = visitStats.reduce((sum, row) => sum + Number(row.visit_count), 0);
        const casesWithMultiple = visitStats.filter(row => Number(row.visit_count) > 1).length;

        returnVisitStats = {
          averageVisitsPerCase: Math.round((totalVisits / visitStats.length) * 10) / 10,
          casesWithMultipleVisits: casesWithMultiple,
          percentageReturning: visitStats.length > 0 ? casesWithMultiple / visitStats.length : 0
        };
      }
    } catch (error) {
      console.warn('tracking_page_views table may not exist yet:', error);
    }

    // Calculate milestone completion rates
    const week2CompletionRate = totalConsultations > 0 ? Number(week2Validations) / totalConsultations : 0;
    const week4CompletionRate = totalConsultations > 0 ? Number(week4Validations) / totalConsultations : 0;
    const week8CompletionRate = totalConsultations > 0 ? Number(week8Validations) / totalConsultations : 0;

    // Calculate dropoff at each milestone
    const dropoffAtMilestone = {
      week2: 1 - week2CompletionRate,
      week4: week2Validations > 0 ? 1 - (Number(week4Validations) / Number(week2Validations)) : 1,
      week8: week4Validations > 0 ? 1 - (Number(week8Validations) / Number(week4Validations)) : 1
    };

    // Get average days to validation
    const validationTimingResult = await sql`
      SELECT
        AVG(EXTRACT(DAY FROM (fm.created_at - c.created_at))) as avg_days_to_first
      FROM feedback_milestones fm
      JOIN consultations c ON fm.consultation_id = c.consultation_id
      WHERE fm.milestone_day = 14
    `.catch(() => [{ avg_days_to_first: null }]);

    // Get premium feature adoption (based on tier)
    const premiumStats = await sql`
      SELECT
        SUM(CASE WHEN tier = 'verified' THEN 1 ELSE 0 END) as research_access,
        SUM(CASE WHEN tier = 'exceptional' THEN 1 ELSE 0 END) as wearable_access
      FROM consultations
    `;

    const usersWithResearchAgentAccess = Number(premiumStats[0]?.research_access || 0);
    const usersWithWearableIntegration = Number(premiumStats[0]?.wearable_access || 0);
    const premiumConversionRate = totalConsultations > 0
      ? (usersWithResearchAgentAccess + usersWithWearableIntegration) / totalConsultations
      : 0;

    // Get validation funnel data for chart
    const validationFunnel = [
      { stage: 'Initial Consultation', count: totalConsultations, percentage: 100 },
      { stage: 'Week 2 Validation', count: Number(week2Validations), percentage: week2CompletionRate * 100 },
      { stage: 'Week 4 Validation', count: Number(week4Validations), percentage: week4CompletionRate * 100 },
      { stage: 'Week 8 Validation', count: Number(week8Validations), percentage: week8CompletionRate * 100 }
    ];

    return NextResponse.json({
      // Outcome Validation
      totalConsultations,
      week2Validations: Number(week2Validations),
      week4Validations: Number(week4Validations),
      week8Validations: Number(week8Validations),
      overallValidationRate: Math.round(overallValidationRate * 100) / 100,

      // Return Visits
      averageVisitsPerCase: returnVisitStats.averageVisitsPerCase,
      casesWithMultipleVisits: returnVisitStats.casesWithMultipleVisits,
      percentageReturning: Math.round(returnVisitStats.percentageReturning * 100) / 100,

      // Milestone Completion
      week2CompletionRate: Math.round(week2CompletionRate * 100) / 100,
      week4CompletionRate: Math.round(week4CompletionRate * 100) / 100,
      week8CompletionRate: Math.round(week8CompletionRate * 100) / 100,

      // User Journey
      averageDaysToFirstValidation: Number(validationTimingResult[0]?.avg_days_to_first || 14).toFixed(1),
      dropoffAtMilestone: {
        week2: Math.round(dropoffAtMilestone.week2 * 100) / 100,
        week4: Math.round(dropoffAtMilestone.week4 * 100) / 100,
        week8: Math.round(dropoffAtMilestone.week8 * 100) / 100
      },

      // Premium Unlocks
      usersWithResearchAgentAccess,
      usersWithWearableIntegration,
      premiumConversionRate: Math.round(premiumConversionRate * 1000) / 10,

      // Chart Data
      validationFunnel,

      // Metadata
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
