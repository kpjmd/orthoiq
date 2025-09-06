import { NextRequest, NextResponse } from 'next/server';
import { completeMDReview } from '@/lib/database';

export async function PATCH(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // For now, we'll allow access but this should be restricted

    const body = await request.json();
    const { queueId, mdName, reviewNotes, mdSignature } = body;

    if (!queueId || !mdName) {
      return NextResponse.json(
        { error: 'Queue ID and MD name are required' },
        { status: 400 }
      );
    }

    // Complete the MD review
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