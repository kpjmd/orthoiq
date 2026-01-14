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

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const body = await request.json();
    const {
      consultationId,
      approved,
      clinicalAccuracy,
      feedbackNotes,
      recommendationChanges,
      reviewerFid
    } = body;

    // Validate required fields
    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId is required' },
        { status: 400 }
      );
    }

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'approved (boolean) is required' },
        { status: 400 }
      );
    }

    if (!clinicalAccuracy || clinicalAccuracy < 1 || clinicalAccuracy > 5) {
      return NextResponse.json(
        { error: 'clinicalAccuracy must be between 1 and 5' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] MD Review submission for consultation ${consultationId}`);

    const sql = getSql();

    // First verify the consultation exists
    const consultation = await sql`
      SELECT consultation_id, tier, specialist_count, consensus_percentage
      FROM consultations
      WHERE consultation_id = ${consultationId}
    `;

    if (consultation.length === 0) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Determine new tier based on approval and accuracy
    let newTier = consultation[0].tier || 'standard';
    if (approved && clinicalAccuracy >= 4) {
      // Upgrade tier logic
      if (newTier === 'standard' || newTier === 'complete') {
        newTier = 'verified';
      }
    }

    // Update local database with MD review
    await sql`
      UPDATE consultations
      SET
        md_reviewed = true,
        md_approved = ${approved},
        md_clinical_accuracy = ${clinicalAccuracy},
        md_feedback_notes = ${feedbackNotes || null},
        md_reviewed_at = CURRENT_TIMESTAMP,
        tier = ${newTier}
      WHERE consultation_id = ${consultationId}
    `;

    console.log(`[${requestId}] Local database updated for consultation ${consultationId}`);

    // Forward to orthoiq-agents backend to resolve predictions
    let backendResult = null;
    let backendSuccess = false;

    try {
      const backendResponse = await fetch(`${AGENTS_ENDPOINT}/predictions/resolve/md-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          mdReviewData: {
            approved,
            clinicalAccuracy: clinicalAccuracy / 5,  // Convert 1-5 scale to 0-1 scale
            recommendations: feedbackNotes,
            timestamp: new Date().toISOString()
          }
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (backendResponse.ok) {
        backendResult = await backendResponse.json();
        backendSuccess = true;
        console.log(`[${requestId}] Backend predictions resolved successfully`);
      } else {
        const errorText = await backendResponse.text();
        console.warn(`[${requestId}] Backend returned ${backendResponse.status}: ${errorText}`);
      }
    } catch (backendError) {
      console.warn(`[${requestId}] orthoiq-agents backend unavailable:`, backendError);
    }

    return NextResponse.json({
      success: true,
      consultationId,
      approved,
      clinicalAccuracy,
      previousTier: consultation[0].tier || 'standard',
      newTier,
      tierUpgraded: newTier !== (consultation[0].tier || 'standard'),
      backendPredictionsResolved: backendSuccess,
      backendResult,
      message: approved
        ? `Consultation approved with ${clinicalAccuracy}/5 clinical accuracy. ${newTier !== consultation[0].tier ? `Upgraded to ${newTier} tier.` : ''}`
        : 'Consultation marked as needing revision.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[${requestId}] Error submitting MD review:`, error);
    return NextResponse.json(
      { error: 'Failed to submit MD review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch a single consultation for review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get('consultationId');

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId query parameter is required' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Get full consultation details for review
    const consultation = await sql`
      SELECT
        c.*,
        q.question as user_question,
        q.response as ai_response,
        q.confidence,
        cf.user_satisfaction,
        cf.outcome_success
      FROM consultations c
      LEFT JOIN questions q ON c.question_id = q.id
      LEFT JOIN consultation_feedback cf ON c.consultation_id = cf.consultation_id
      WHERE c.consultation_id = ${consultationId}
    `;

    if (consultation.length === 0) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    const row = consultation[0];

    // Get milestone feedback if any
    const milestones = await sql`
      SELECT *
      FROM feedback_milestones
      WHERE consultation_id = ${consultationId}
      ORDER BY milestone_day ASC
    `;

    return NextResponse.json({
      consultationId: row.consultation_id,
      questionId: row.question_id,
      fid: row.fid,
      mode: row.mode,
      createdAt: row.created_at,

      // Question and Response
      userQuestion: row.user_question || 'Question not available',
      aiResponse: row.ai_response || row.coordination_summary || 'Response not available',
      confidence: row.confidence,

      // Agent Details
      specialistCount: row.specialist_count,
      participatingSpecialists: row.participating_specialists,
      coordinationSummary: row.coordination_summary,
      consensus: row.consensus_percentage,

      // Current Status
      tier: row.tier || 'standard',
      mdReviewed: row.md_reviewed,
      mdApproved: row.md_approved,
      mdClinicalAccuracy: row.md_clinical_accuracy,
      mdFeedbackNotes: row.md_feedback_notes,
      mdReviewedAt: row.md_reviewed_at,

      // User Feedback
      userSatisfaction: row.user_satisfaction,
      outcomeSuccess: row.outcome_success,

      // Milestone Validations
      milestones: milestones.map((m: any) => ({
        milestoneDay: m.milestone_day,
        painLevel: m.pain_level,
        functionalScore: m.functional_score,
        overallProgress: m.overall_progress,
        milestoneAchieved: m.milestone_achieved,
        createdAt: m.created_at
      })),

      // Metadata
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching consultation for MD review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
