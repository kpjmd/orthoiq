import { NextRequest, NextResponse } from 'next/server';
import { reviewResponse } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { 
      responseId, 
      approved, 
      reviewerFid, 
      reviewerName, 
      notes,
      reviewDetails,
      medicalCategory 
    } = await request.json();

    if (!responseId || approved === undefined || !reviewerFid || !reviewerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In a real app, you'd verify the reviewer is authorized
    const reviewId = await reviewResponse(
      responseId, 
      approved, 
      reviewerFid, 
      reviewerName, 
      notes,
      reviewDetails,
      medicalCategory
    );

    return NextResponse.json({
      success: true,
      reviewId,
      message: `Response ${approved ? 'approved' : 'rejected'} successfully with enhanced training data`
    });

  } catch (error) {
    console.error('Error reviewing response:', error);
    return NextResponse.json(
      { error: 'Failed to review response' },
      { status: 500 }
    );
  }
}