import { NextRequest, NextResponse } from 'next/server';
import { completeMDReview } from '@/lib/database';
import { neon } from '@neondatabase/serverless';

function getSql() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database URL not configured');
  }
  return neon(databaseUrl);
}

export async function PATCH(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // For now, we'll allow access but this should be restricted

    const body = await request.json();
    const { queueId, consultationId, mdName, reviewNotes, mdSignature } = body;

    // Handle consultation-based reviews (new system)
    if (consultationId) {
      const sql = getSql();

      await sql`
        UPDATE consultations
        SET
          md_reviewed = true,
          md_approved = true,
          md_reviewer = ${mdName},
          md_review_notes = ${reviewNotes || null},
          md_signature = ${mdSignature || null},
          md_reviewed_at = CURRENT_TIMESTAMP,
          tier = CASE
            WHEN tier = 'standard' THEN 'complete'
            WHEN tier = 'complete' THEN 'verified'
            ELSE 'exceptional'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE consultation_id = ${consultationId}
      `;

      return NextResponse.json({
        success: true,
        message: 'MD review completed successfully',
        consultationId,
        reviewedBy: mdName
      }, { status: 200 });
    }

    // Handle legacy queue-based reviews (old system)
    if (!queueId || !mdName) {
      return NextResponse.json(
        { error: 'Queue ID or Consultation ID and MD name are required' },
        { status: 400 }
      );
    }

    // Complete the MD review (legacy)
    await completeMDReview(queueId, mdName, reviewNotes, mdSignature);

    return NextResponse.json({
      success: true,
      message: 'MD review completed successfully',
      queueId,
      reviewedBy: mdName
    }, { status: 200 });

  } catch (error) {
    console.error('Error completing MD review:', error);
    return NextResponse.json(
      { error: 'Failed to complete MD review' },
      { status: 500 }
    );
  }
}