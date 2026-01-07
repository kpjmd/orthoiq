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

    // Get tier distribution
    const tierDistribution = await sql`
      SELECT
        COALESCE(tier, 'standard') as tier,
        COUNT(*) as count,
        AVG(specialist_count) as avg_specialists,
        AVG(CASE
          WHEN consensus_percentage IS NOT NULL THEN consensus_percentage
          ELSE 0.75
        END) as avg_consensus
      FROM consultations
      GROUP BY COALESCE(tier, 'standard')
    `;

    // Calculate totals
    const total = tierDistribution.reduce((sum, row) => sum + Number(row.count), 0);

    // Format by tier with percentages
    const tierOrder = ['standard', 'complete', 'verified', 'exceptional'];
    const byTier: Record<string, { count: number; percentage: number; avgSpecialists: number; avgConsensus: number }> = {};

    tierOrder.forEach(tier => {
      const row = tierDistribution.find(r => r.tier === tier);
      byTier[tier] = {
        count: row ? Number(row.count) : 0,
        percentage: row && total > 0 ? Math.round((Number(row.count) / total) * 1000) / 10 : 0,
        avgSpecialists: row ? Math.round(Number(row.avg_specialists || 0) * 10) / 10 : 0,
        avgConsensus: row ? Math.round(Number(row.avg_consensus || 0) * 100) : 0
      };
    });

    // Get upgrade pipeline metrics
    const [awaitingMDReview, awaitingValidation, recentUpgrades] = await Promise.all([
      // Cards that could upgrade to verified (complete tier, high consensus, not MD reviewed)
      sql`
        SELECT COUNT(*) as count
        FROM consultations
        WHERE (tier = 'complete' OR (tier IS NULL AND specialist_count >= 4))
          AND md_reviewed = false
          AND (consensus_percentage >= 0.80 OR specialist_count >= 4)
      `,

      // Cards awaiting validation (verified tier, no milestone feedback yet)
      sql`
        SELECT COUNT(*) as count
        FROM consultations c
        WHERE c.tier = 'verified'
          AND NOT EXISTS (
            SELECT 1 FROM feedback_milestones fm
            WHERE fm.consultation_id = c.consultation_id
          )
      `,

      // Recent tier upgrades (last 7 days)
      sql`
        SELECT COUNT(*) as count
        FROM consultations
        WHERE tier IN ('verified', 'exceptional')
          AND (md_reviewed_at >= CURRENT_DATE - INTERVAL '7 days'
               OR created_at >= CURRENT_DATE - INTERVAL '7 days')
      `
    ]);

    // Get privacy and sharing stats
    const [privacyStats, sharingStats] = await Promise.all([
      sql`
        SELECT
          SUM(CASE WHEN is_private = true THEN 1 ELSE 0 END) as private_count,
          SUM(CASE WHEN is_private = false OR is_private IS NULL THEN 1 ELSE 0 END) as public_count
        FROM consultations
      `,

      // QR scans this week (if table exists)
      sql`
        SELECT COUNT(*) as count
        FROM qr_scans
        WHERE scanned_at >= CURRENT_DATE - INTERVAL '7 days'
      `.catch(() => [{ count: 0 }])
    ]);

    // Calculate average specialists per card
    const avgSpecialistsResult = await sql`
      SELECT AVG(specialist_count) as avg
      FROM consultations
      WHERE specialist_count > 0
    `;

    return NextResponse.json({
      // Overall counts
      total,

      // Tier breakdown
      byTier,

      // Quality metrics by tier
      averageSpecialistsPerCard: Number(avgSpecialistsResult[0]?.avg || 0).toFixed(1),
      averageConsensusPerTier: {
        standard: byTier.standard.avgConsensus,
        complete: byTier.complete.avgConsensus,
        verified: byTier.verified.avgConsensus,
        exceptional: byTier.exceptional.avgConsensus
      },

      // Upgrade pipeline
      cardsAwaitingMDReview: Number(awaitingMDReview[0]?.count || 0),
      cardsAwaitingValidation: Number(awaitingValidation[0]?.count || 0),
      recentUpgrades: Number(recentUpgrades[0]?.count || 0),

      // Privacy and sharing
      publicCards: Number(privacyStats[0]?.public_count || 0),
      privateCards: Number(privacyStats[0]?.private_count || 0),
      qrScansThisWeek: Number(sharingStats[0]?.count || 0),

      // Metadata
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching card distribution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card distribution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
