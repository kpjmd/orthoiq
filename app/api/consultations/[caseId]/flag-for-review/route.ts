import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getSql() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) throw new Error('Database URL not configured');
  return neon(databaseUrl);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId: consultationId } = await params;
    const body = await request.json();
    const { requiresReview, reason, qualityScore } = body;

    // Validate
    if (typeof requiresReview !== 'boolean') {
      return NextResponse.json(
        { error: 'requiresReview (boolean) is required' },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Verify consultation exists
    const existing = await sql`
      SELECT consultation_id FROM consultations
      WHERE consultation_id = ${consultationId}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Update consultation
    await sql`
      UPDATE consultations
      SET
        requires_md_review = ${requiresReview}
      WHERE consultation_id = ${consultationId}
    `;

    console.log(
      `Consultation ${consultationId} flagged for MD review: ${requiresReview}`,
      { reason, qualityScore }
    );

    return NextResponse.json({
      success: true,
      consultationId,
      requiresReview,
      message: requiresReview
        ? 'Consultation flagged for MD review'
        : 'MD review flag removed'
    });

  } catch (error) {
    console.error('Error flagging consultation for review:', error);
    return NextResponse.json(
      { error: 'Failed to flag consultation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
