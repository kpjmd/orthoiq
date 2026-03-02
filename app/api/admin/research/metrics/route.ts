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

    let totalSyntheses = 0;
    let synthesesLast7Days = 0;
    let uniqueResearchers = 0;
    let totalStudiesAnalyzed = 0;
    let mdReviewedCount = 0;
    let avgStudyCount = 0;
    let avgCitations = 0;
    let avgImpactFactor = 0;
    let evidenceDistribution: Array<{ strength: string; count: number }> = [];
    let rarityDistribution: Array<{ tier: string; count: number }> = [];
    let volumeTrend: Array<{ date: string; count: number }> = [];
    let topConditions: Array<{ condition: string; count: number }> = [];
    let subscriptionsByTier: Array<{ tier: string; total: number; active: number }> = [];

    try {
      // Aggregated totals from research_syntheses
      const totalsResult = await sql`
        SELECT
          COUNT(*) as total_syntheses,
          COUNT(CASE WHEN md_reviewed = true THEN 1 END) as md_reviewed_count,
          AVG(study_count) as avg_study_count,
          AVG(total_citations) as avg_citations,
          AVG(avg_impact_factor) as avg_impact_factor,
          COALESCE(SUM(study_count), 0) as total_studies_analyzed,
          COUNT(DISTINCT fid) as unique_researchers
        FROM research_syntheses
      `;
      const totals = totalsResult[0];
      totalSyntheses = Number(totals?.total_syntheses || 0);
      mdReviewedCount = Number(totals?.md_reviewed_count || 0);
      avgStudyCount = Math.round(Number(totals?.avg_study_count || 0) * 10) / 10;
      avgCitations = Math.round(Number(totals?.avg_citations || 0) * 10) / 10;
      avgImpactFactor = Math.round(Number(totals?.avg_impact_factor || 0) * 100) / 100;
      totalStudiesAnalyzed = Number(totals?.total_studies_analyzed || 0);
      uniqueResearchers = Number(totals?.unique_researchers || 0);

      // 7-day count
      const recentResult = await sql`
        SELECT COUNT(*) as count
        FROM research_syntheses
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      `;
      synthesesLast7Days = Number(recentResult[0]?.count || 0);

      // Evidence strength distribution
      const evidenceResult = await sql`
        SELECT
          COALESCE(evidence_strength, 'unknown') as evidence_strength,
          COUNT(*) as count
        FROM research_syntheses
        GROUP BY evidence_strength
        ORDER BY
          CASE evidence_strength
            WHEN 'strong' THEN 1
            WHEN 'moderate' THEN 2
            WHEN 'weak' THEN 3
            WHEN 'insufficient' THEN 4
            ELSE 5
          END
      `;
      evidenceDistribution = evidenceResult.map(r => ({
        strength: r.evidence_strength,
        count: Number(r.count)
      }));

      // Rarity tier distribution
      const rarityResult = await sql`
        SELECT
          COALESCE(rarity_tier, 'bronze') as rarity_tier,
          COUNT(*) as count
        FROM research_syntheses
        GROUP BY rarity_tier
        ORDER BY
          CASE rarity_tier
            WHEN 'platinum' THEN 1
            WHEN 'gold' THEN 2
            WHEN 'silver' THEN 3
            WHEN 'bronze' THEN 4
            ELSE 5
          END
      `;
      rarityDistribution = rarityResult.map(r => ({
        tier: r.rarity_tier,
        count: Number(r.count)
      }));

      // 30-day volume trend
      const trendResult = await sql`
        SELECT
          TO_CHAR(DATE(created_at), 'MM/DD') as date,
          COUNT(*) as count
        FROM research_syntheses
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `;
      volumeTrend = trendResult.map(r => ({ date: r.date, count: Number(r.count) }));

      // Top 10 queried conditions
      const conditionsResult = await sql`
        SELECT
          query_condition,
          COUNT(*) as count
        FROM research_syntheses
        WHERE query_condition IS NOT NULL AND query_condition != ''
        GROUP BY query_condition
        ORDER BY count DESC
        LIMIT 10
      `;
      topConditions = conditionsResult.map(r => ({
        condition: r.query_condition,
        count: Number(r.count)
      }));

    } catch (error) {
      console.warn('research_syntheses table query error:', error);
    }

    // Research subscriptions (separate try/catch — table may not exist)
    try {
      const subsResult = await sql`
        SELECT
          tier,
          COUNT(*) as total,
          SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count
        FROM research_subscriptions
        GROUP BY tier
        ORDER BY
          CASE tier
            WHEN 'institution' THEN 1
            WHEN 'practitioner' THEN 2
            WHEN 'scholar' THEN 3
            ELSE 4
          END
      `;
      subscriptionsByTier = subsResult.map(r => ({
        tier: r.tier,
        total: Number(r.total),
        active: Number(r.active_count)
      }));
    } catch (error) {
      console.warn('research_subscriptions table may not exist yet:', error);
    }

    const mdReviewRate = totalSyntheses > 0
      ? Math.round((mdReviewedCount / totalSyntheses) * 1000) / 10
      : 0;

    return NextResponse.json({
      totalSyntheses,
      synthesesLast7Days,
      uniqueResearchers,
      totalStudiesAnalyzed,
      mdReviewedCount,
      mdReviewRate,
      avgStudyCount,
      avgCitations,
      avgImpactFactor,
      evidenceDistribution,
      rarityDistribution,
      volumeTrend,
      topConditions,
      subscriptionsByTier,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching research metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
