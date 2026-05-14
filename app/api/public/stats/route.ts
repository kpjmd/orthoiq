import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { agentsFetch } from '@/lib/agentsClient';

function getSql() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) throw new Error('Database URL not configured');
  return neon(databaseUrl);
}

export async function GET() {
  try {
    const sql = getSql();

    // ── Consultation overview ──────────────────────────────────────────────
    const [totalResult, avgResult, queryTypeResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM consultations`,

      sql`SELECT
            AVG(specialist_count) as avg_specialists,
            AVG(CASE WHEN md_approved = true THEN 1 ELSE 0 END) as approval_rate
          FROM consultations
          WHERE specialist_count IS NOT NULL`,

      sql`SELECT query_type, COUNT(*) as count
          FROM consultations
          WHERE query_type IS NOT NULL
          GROUP BY query_type`,
    ]);

    const totalConsultations = Number(totalResult[0]?.count || 0);
    const averageAgentsPerConsultation = Number(avgResult[0]?.avg_specialists || 0).toFixed(1);
    const averageMDApprovalRate = Number(avgResult[0]?.approval_rate || 0);

    let queryTypeBreakdown = null;
    if (queryTypeResult.length > 0) {
      const counts: Record<string, number> = {};
      let total = 0;
      for (const row of queryTypeResult) {
        counts[row.query_type] = Number(row.count);
        total += Number(row.count);
      }
      queryTypeBreakdown = {
        clinical: counts['clinical'] || 0,
        informational: counts['informational'] || 0,
        clinicalPct: total > 0 ? Math.round(((counts['clinical'] || 0) / total) * 1000) / 10 : 0,
        informationalPct: total > 0 ? Math.round(((counts['informational'] || 0) / total) * 1000) / 10 : 0,
      };
    }

    // ── Research stats ─────────────────────────────────────────────────────
    let researchStats = null;
    try {
      const [totalsResult, evidenceResult, rarityResult] = await Promise.all([
        sql`SELECT
              COUNT(*) as total_syntheses,
              COALESCE(SUM(study_count), 0) as total_studies_analyzed,
              AVG(total_citations) as avg_citations,
              AVG(avg_impact_factor) as avg_impact_factor
            FROM research_syntheses`,

        sql`SELECT COALESCE(evidence_strength, 'unknown') as strength, COUNT(*) as count
            FROM research_syntheses
            GROUP BY evidence_strength
            ORDER BY CASE evidence_strength
              WHEN 'strong' THEN 1 WHEN 'moderate' THEN 2 WHEN 'weak' THEN 3
              WHEN 'insufficient' THEN 4 ELSE 5 END`,

        sql`SELECT COALESCE(rarity_tier, 'bronze') as tier, COUNT(*) as count
            FROM research_syntheses
            GROUP BY rarity_tier
            ORDER BY CASE rarity_tier
              WHEN 'platinum' THEN 1 WHEN 'gold' THEN 2 WHEN 'silver' THEN 3
              WHEN 'bronze' THEN 4 ELSE 5 END`,
      ]);

      // Try to get live agent stats (best-effort)
      let agentLiveStats = null;
      try {
        const res = await agentsFetch('/status', {
          caller: 'admin',
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          const s = data?.researchAgent?.statistics;
          if (s) {
            agentLiveStats = {
              totalSearches: Number(s.totalSearches || 0),
              totalCitations: Number(s.totalCitations || 0),
              avgResponseTime: Number(s.avgResponseTime || 0),
              tokenBalance: Number(s.tokenBalance || 0),
            };
          }
        }
      } catch { /* agents offline — skip */ }

      researchStats = {
        totalSyntheses: Number(totalsResult[0]?.total_syntheses || 0),
        totalStudiesAnalyzed: Number(totalsResult[0]?.total_studies_analyzed || 0),
        avgCitations: Math.round(Number(totalsResult[0]?.avg_citations || 0) * 10) / 10,
        avgImpactFactor: Math.round(Number(totalsResult[0]?.avg_impact_factor || 0) * 100) / 100,
        evidenceDistribution: evidenceResult.map(r => ({ strength: r.strength, count: Number(r.count) })),
        rarityDistribution: rarityResult.map(r => ({ tier: r.tier, count: Number(r.count) })),
        agentLiveStats,
      };
    } catch {
      // research_syntheses table may not exist yet
    }

    // ── PROMIS stats ────────────────────────────────────────────────────────
    let promisStats = null;
    try {
      const baselineResult = await sql`
        SELECT COUNT(DISTINCT consultation_id) as count
        FROM promis_responses WHERE timepoint = 'baseline'`;
      const baselineCaptureCount = Number(baselineResult[0]?.count || 0);

      const timepointResult = await sql`
        SELECT timepoint, COUNT(*) as count FROM promis_responses GROUP BY timepoint`;
      const getCount = (tp: string) =>
        timepointResult.find(r => r.timepoint === tp)?.count || 0;
      const baselineCount = Number(getCount('baseline'));
      const week2Count = Number(getCount('2week'));
      const week4Count = Number(getCount('4week'));
      const week8Count = Number(getCount('8week'));

      const trendResult = await sql`
        SELECT timepoint, AVG(physical_function_t_score) as avg_pf, AVG(pain_interference_t_score) as avg_pi
        FROM promis_responses GROUP BY timepoint`;
      const baselineTrend = trendResult.find(r => r.timepoint === 'baseline');

      const improvementResult = await sql`
        WITH baseline AS (
          SELECT consultation_id, physical_function_t_score AS pf_base, pain_interference_t_score AS pi_base
          FROM promis_responses WHERE timepoint = 'baseline' AND physical_function_t_score IS NOT NULL
        ),
        latest_followup AS (
          SELECT DISTINCT ON (consultation_id) consultation_id,
                 physical_function_t_score AS pf_follow, pain_interference_t_score AS pi_follow
          FROM promis_responses WHERE timepoint IN ('2week','4week','8week')
          ORDER BY consultation_id,
            CASE timepoint WHEN '8week' THEN 3 WHEN '4week' THEN 2 WHEN '2week' THEN 1 END DESC
        )
        SELECT COUNT(*) AS total_with_followup,
          COUNT(CASE WHEN (lf.pf_follow - b.pf_base >= 5)
            OR (b.pi_base IS NOT NULL AND lf.pi_follow IS NOT NULL AND b.pi_base - lf.pi_follow >= 5)
            THEN 1 END) AS clinically_improved
        FROM baseline b JOIN latest_followup lf USING (consultation_id)`;

      const totalWithFollowup = Number(improvementResult[0]?.total_with_followup || 0);
      const clinicallyImprovedCount = Number(improvementResult[0]?.clinically_improved || 0);

      promisStats = {
        totalConsultations,
        baselineCaptureCount,
        baselineCaptureRate: totalConsultations > 0
          ? Math.round((baselineCaptureCount / totalConsultations) * 1000) / 10 : 0,
        followUpCompletion: { baseline: baselineCount, week2: week2Count, week4: week4Count, week8: week8Count },
        followUpRates: {
          week2: baselineCount > 0 ? Math.round((week2Count / baselineCount) * 1000) / 10 : 0,
          week4: baselineCount > 0 ? Math.round((week4Count / baselineCount) * 1000) / 10 : 0,
          week8: baselineCount > 0 ? Math.round((week8Count / baselineCount) * 1000) / 10 : 0,
        },
        clinicallyImprovedCount,
        clinicallyImprovedRate: totalWithFollowup > 0
          ? Math.round((clinicallyImprovedCount / totalWithFollowup) * 1000) / 10 : 0,
        totalWithFollowup,
        avgBaselinePfScore: baselineTrend?.avg_pf != null
          ? Math.round(Number(baselineTrend.avg_pf) * 10) / 10 : null,
        avgBaselinePiScore: baselineTrend?.avg_pi != null
          ? Math.round(Number(baselineTrend.avg_pi) * 10) / 10 : null,
      };
    } catch {
      // promis_responses table may not exist yet
    }

    return NextResponse.json({
      totalConsultations,
      averageAgentsPerConsultation,
      averageMDApprovalRate,
      queryTypeBreakdown,
      researchStats,
      promisStats,
    });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
