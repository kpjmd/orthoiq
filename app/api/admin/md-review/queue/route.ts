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
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const filter = searchParams.get('filter') || 'all'; // all, urgent, high-consensus, new

    // Build filter conditions
    let filterCondition = '';
    switch (filter) {
      case 'urgent':
        // Cases older than 3 days
        filterCondition = `AND c.created_at < CURRENT_DATE - INTERVAL '3 days'`;
        break;
      case 'high-consensus':
        // Cases with 90%+ consensus
        filterCondition = `AND (c.consensus_percentage >= 0.90 OR c.specialist_count = 5)`;
        break;
      case 'new':
        // Cases from last 24 hours
        filterCondition = `AND c.created_at >= CURRENT_DATE - INTERVAL '1 day'`;
        break;
      default:
        filterCondition = '';
    }

    // Get pending consultations for MD review
    // Criteria: 4+ specialists, 80%+ consensus (or high specialist count), or flagged by backend, not yet reviewed
    const pendingConsultations = await sql`
      SELECT
        c.consultation_id,
        c.question_id,
        c.fid,
        c.mode,
        c.specialist_count,
        c.coordination_summary,
        c.created_at,
        COALESCE(c.tier, 'standard') as current_tier,
        COALESCE(c.consensus_percentage, 0.85) as consensus,
        COALESCE(c.requires_md_review, false) as requires_md_review,
        q.question as user_question,
        q.response as ai_response,
        q.confidence,
        cf.user_satisfaction,
        cf.outcome_success
      FROM consultations c
      LEFT JOIN questions q ON c.question_id = q.id
      LEFT JOIN consultation_feedback cf ON c.consultation_id = cf.consultation_id
      WHERE c.md_reviewed = false
        AND (
          c.specialist_count >= 4
          OR c.mode = 'normal'
          OR c.requires_md_review = true
        )
        AND (c.consensus_percentage >= 0.80 OR c.specialist_count >= 4 OR c.consensus_percentage IS NULL OR c.requires_md_review = true)
      ORDER BY
        CASE
          WHEN c.created_at < CURRENT_DATE - INTERVAL '3 days' THEN 0
          ELSE 1
        END,
        c.specialist_count DESC,
        c.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count for pagination
    const totalCountResult = await sql`
      SELECT COUNT(*) as count
      FROM consultations c
      WHERE c.md_reviewed = false
        AND (
          c.specialist_count >= 4
          OR c.mode = 'normal'
          OR c.requires_md_review = true
        )
        AND (c.consensus_percentage >= 0.80 OR c.specialist_count >= 4 OR c.consensus_percentage IS NULL OR c.requires_md_review = true)
    `;
    const totalCount = Number(totalCountResult[0]?.count || 0);

    // Get review statistics
    const [reviewStats, todayStats] = await Promise.all([
      sql`
        SELECT
          COUNT(*) FILTER (WHERE md_reviewed = true) as total_reviewed,
          COUNT(*) FILTER (WHERE md_approved = true) as total_approved,
          AVG(EXTRACT(EPOCH FROM (md_reviewed_at - created_at)) / 3600) FILTER (WHERE md_reviewed = true) as avg_review_time_hours
        FROM consultations
        WHERE md_reviewed = true
      `,
      sql`
        SELECT COUNT(*) as count
        FROM consultations
        WHERE md_reviewed = true
          AND md_reviewed_at >= CURRENT_DATE
      `
    ]);

    // Deduplicate consultations by consultation_id
    const seenIds = new Set<string>();
    const uniqueConsultations = pendingConsultations.filter((row: any) => {
      if (seenIds.has(row.consultation_id)) {
        return false;
      }
      seenIds.add(row.consultation_id);
      return true;
    });

    // Format pending consultations
    const formattedQueue = uniqueConsultations.map((row: any) => {
      // Determine urgency level based on age
      const createdAt = new Date(row.created_at);
      const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      let urgencyLevel: 'routine' | 'semi-urgent' | 'urgent' = 'routine';
      if (ageInDays > 5) urgencyLevel = 'urgent';
      else if (ageInDays > 2) urgencyLevel = 'semi-urgent';

      // Determine potential tier after approval
      const potentialTier = row.current_tier === 'standard' ? 'complete' :
                           row.current_tier === 'complete' ? 'verified' : 'exceptional';

      return {
        consultationId: row.consultation_id,
        caseId: row.consultation_id,
        questionId: row.question_id,
        fid: row.fid,
        mode: row.mode,
        submittedAt: row.created_at,
        userQuestion: row.user_question || 'Question not available',
        aiResponse: row.ai_response || row.coordination_summary || 'Response not available',
        participatingAgents: row.specialist_count || 0,
        consensus: Number(row.consensus) || 0.85,
        confidence: row.confidence || 0,
        currentTier: row.current_tier,
        potentialTier,
        urgencyLevel,
        userSatisfaction: row.user_satisfaction,
        outcomeSuccess: row.outcome_success,
        redFlags: [], // Could be populated from response analysis
        clinicalConcerns: [] // Could be populated from response analysis
      };
    });

    // Use unique count for accurate pagination
    const uniqueCount = uniqueConsultations.length;

    return NextResponse.json({
      // Queue data
      queue: formattedQueue,
      totalCount: uniqueCount,
      hasMore: offset + limit < uniqueCount,

      // Review statistics
      statistics: {
        pending: totalCount,
        approvedToday: Number(todayStats[0]?.count || 0),
        totalReviewed: Number(reviewStats[0]?.total_reviewed || 0),
        totalApproved: Number(reviewStats[0]?.total_approved || 0),
        averageReviewTimeHours: Number(reviewStats[0]?.avg_review_time_hours || 0).toFixed(1)
      },

      // Alert flag
      showAlert: totalCount > 50,
      alertMessage: totalCount > 50 ? `MD Review Queue needs attention: ${totalCount} pending consultations` : null,

      // Pagination
      pagination: {
        limit,
        offset,
        total: totalCount
      },

      // Metadata
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching MD review queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MD review queue', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
