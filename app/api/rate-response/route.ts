import { NextRequest, NextResponse } from 'next/server';
import { logRating } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { fid, question, rating } = await request.json();

    if (!fid || !question || rating === undefined) {
      return NextResponse.json(
        { error: 'FID, question, and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Log the rating
    await logRating(fid, question, rating);

    return NextResponse.json({ 
      success: true,
      message: 'Rating submitted successfully' 
    });

  } catch (error) {
    console.error('Rate response error:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}