import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getSql() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database URL not configured');
  }
  return neon(databaseUrl);
}

export async function GET(_request: NextRequest) {
  try {
    const sql = getSql();

    // Total consultations (denominator)
    const totalResult = await sql`SELECT COUNT(*) as count FROM consultations`;
    const totalConsultations = Number(totalResult[0]?.count || 0);

    // Wrap optional table queries in try/catch in case promis_responses doesn't exist
    let baselineCaptureCount = 0;
    let followUpByTimepoint: Array<{ timepoint: string; count: number }> = [];
    let pfDistribution: Array<{ bucket: string; count: number }> = [];
    let piDistribution: Array<{ bucket: string; count: number }> = [];
    let tScoreTrend: Array<{ timepoint: string; avgPf: number | null; avgPi: number | null; count: number }> = [];
    let responsesLast7Days = 0;
    let painInterferenceAssessed = 0;
    let clinicallyImprovedCount = 0;
    let totalWithFollowup = 0;

    try {
      // Baseline capture count
      const baselineResult = await sql`
        SELECT COUNT(DISTINCT consultation_id) as count
        FROM promis_responses
        WHERE timepoint = 'baseline'
      `;
      baselineCaptureCount = Number(baselineResult[0]?.count || 0);

      // Follow-up counts by timepoint
      const timepointResult = await sql`
        SELECT timepoint, COUNT(*) as count
        FROM promis_responses
        GROUP BY timepoint
      `;
      followUpByTimepoint = timepointResult.map(r => ({
        timepoint: r.timepoint,
        count: Number(r.count)
      }));

      // Physical Function T-score distribution (baseline only)
      const pfResult = await sql`
        SELECT
          CASE
            WHEN physical_function_t_score < 30 THEN 'severe_limitation'
            WHEN physical_function_t_score < 40 THEN 'moderate_limitation'
            WHEN physical_function_t_score < 50 THEN 'mild_limitation'
            ELSE 'normal_or_above'
          END as bucket,
          COUNT(*) as count
        FROM promis_responses
        WHERE timepoint = 'baseline' AND physical_function_t_score IS NOT NULL
        GROUP BY bucket
      `;
      pfDistribution = pfResult.map(r => ({ bucket: r.bucket, count: Number(r.count) }));

      // Pain Interference T-score distribution (baseline only)
      const piResult = await sql`
        SELECT
          CASE
            WHEN pain_interference_t_score IS NULL THEN 'not_assessed'
            WHEN pain_interference_t_score < 50 THEN 'minimal'
            WHEN pain_interference_t_score < 60 THEN 'mild'
            WHEN pain_interference_t_score < 70 THEN 'moderate'
            ELSE 'severe'
          END as bucket,
          COUNT(*) as count
        FROM promis_responses
        WHERE timepoint = 'baseline'
        GROUP BY bucket
      `;
      piDistribution = piResult.map(r => ({ bucket: r.bucket, count: Number(r.count) }));

      // Average T-scores by timepoint (trend)
      const trendResult = await sql`
        SELECT
          timepoint,
          AVG(physical_function_t_score) as avg_pf,
          AVG(pain_interference_t_score) as avg_pi,
          COUNT(*) as count
        FROM promis_responses
        GROUP BY timepoint
        ORDER BY
          CASE timepoint
            WHEN 'baseline' THEN 1
            WHEN '2week' THEN 2
            WHEN '4week' THEN 3
            WHEN '8week' THEN 4
            ELSE 5
          END
      `;
      tScoreTrend = trendResult.map(r => ({
        timepoint: r.timepoint,
        avgPf: r.avg_pf !== null ? Math.round(Number(r.avg_pf) * 10) / 10 : null,
        avgPi: r.avg_pi !== null ? Math.round(Number(r.avg_pi) * 10) / 10 : null,
        count: Number(r.count)
      }));

      // Recent activity
      const recentResult = await sql`
        SELECT COUNT(*) as count
        FROM promis_responses
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      `;
      responsesLast7Days = Number(recentResult[0]?.count || 0);

      // Pain interference assessed count
      const piAssessedResult = await sql`
        SELECT COUNT(DISTINCT consultation_id) as count
        FROM promis_responses
        WHERE pain_interference_t_score IS NOT NULL
      `;
      painInterferenceAssessed = Number(piAssessedResult[0]?.count || 0);

      // Clinically meaningful improvement: patients with ≥5 T-score improvement
      // (PF improves by ≥5 OR PI decreases by ≥5) from baseline to their latest follow-up
      const improvementResult = await sql`
        WITH baseline AS (
          SELECT consultation_id,
                 physical_function_t_score AS pf_base,
                 pain_interference_t_score  AS pi_base
          FROM promis_responses
          WHERE timepoint = 'baseline'
            AND physical_function_t_score IS NOT NULL
        ),
        latest_followup AS (
          SELECT DISTINCT ON (consultation_id)
                 consultation_id,
                 physical_function_t_score AS pf_follow,
                 pain_interference_t_score  AS pi_follow
          FROM promis_responses
          WHERE timepoint IN ('2week', '4week', '8week')
          ORDER BY consultation_id,
            CASE timepoint WHEN '8week' THEN 3 WHEN '4week' THEN 2 WHEN '2week' THEN 1 END DESC
        )
        SELECT
          COUNT(*) AS total_with_followup,
          COUNT(
            CASE
              WHEN (lf.pf_follow - b.pf_base >= 5)
                OR (b.pi_base IS NOT NULL AND lf.pi_follow IS NOT NULL AND b.pi_base - lf.pi_follow >= 5)
              THEN 1
            END
          ) AS clinically_improved
        FROM baseline b
        JOIN latest_followup lf USING (consultation_id)
      `;
      clinicallyImprovedCount = Number(improvementResult[0]?.clinically_improved || 0);
      totalWithFollowup = Number(improvementResult[0]?.total_with_followup || 0);

    } catch (error) {
      console.warn('promis_responses table may not exist yet:', error);
    }

    // Build follow-up completion funnel
    const getTimepointCount = (tp: string) =>
      followUpByTimepoint.find(r => r.timepoint === tp)?.count || 0;

    const baselineCount = getTimepointCount('baseline');
    const week2Count = getTimepointCount('2week');
    const week4Count = getTimepointCount('4week');
    const week8Count = getTimepointCount('8week');

    const baselineCaptureRate = totalConsultations > 0
      ? Math.round((baselineCaptureCount / totalConsultations) * 1000) / 10
      : 0;

    const followUpRates = {
      week2: baselineCount > 0 ? Math.round((week2Count / baselineCount) * 1000) / 10 : 0,
      week4: baselineCount > 0 ? Math.round((week4Count / baselineCount) * 1000) / 10 : 0,
      week8: baselineCount > 0 ? Math.round((week8Count / baselineCount) * 1000) / 10 : 0,
    };

    const clinicallyImprovedRate = totalWithFollowup > 0
      ? Math.round((clinicallyImprovedCount / totalWithFollowup) * 1000) / 10
      : 0;

    // Extract avg baseline T-scores from trend data
    const baselineTrend = tScoreTrend.find(r => r.timepoint === 'baseline');
    const avgBaselinePfScore = baselineTrend?.avgPf ?? null;
    const avgBaselinePiScore = baselineTrend?.avgPi ?? null;

    return NextResponse.json({
      totalConsultations,
      baselineCaptureCount,
      baselineCaptureRate,
      painInterferenceAssessed,
      followUpCompletion: {
        baseline: baselineCount,
        week2: week2Count,
        week4: week4Count,
        week8: week8Count,
      },
      followUpRates,
      physicalFunctionDistribution: pfDistribution,
      painInterferenceDistribution: piDistribution,
      tScoreTrend,
      responsesLast7Days,
      clinicallyImprovedCount,
      clinicallyImprovedRate,
      totalWithFollowup,
      avgBaselinePfScore,
      avgBaselinePiScore,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching PROMIS metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PROMIS metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
