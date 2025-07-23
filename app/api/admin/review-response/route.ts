import { NextRequest, NextResponse } from 'next/server';
import { reviewResponse } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { responseId, approved, reviewerFid, reviewerName, notes } = await request.json();

    if (!responseId || approved === undefined || !reviewerFid || !reviewerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In a real app, you'd verify the reviewer is authorized
    await reviewResponse(responseId, approved, reviewerFid, reviewerName, notes);

    return NextResponse.json({
      success: true,
      message: `Response ${approved ? 'approved' : 'rejected'} successfully`
    });

  } catch (error) {
    console.error('Error reviewing response:', error);
    return NextResponse.json(
      { error: 'Failed to review response' },
      { status: 500 }
    );
  }
}