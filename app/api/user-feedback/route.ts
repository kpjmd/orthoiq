import { NextRequest, NextResponse } from 'next/server';
import { logUserFeedback, getUserFeedback, initDatabase } from '@/lib/database';

// Rate limiting to prevent abuse
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(fid: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(fid) || [];
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter((time: number) => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  // Add current request and update map
  recentRequests.push(now);
  rateLimitMap.set(fid, recentRequests);
  
  return false;
}

// GET: Retrieve existing feedback for a question
export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');
    const fid = searchParams.get('fid');

    if (!questionId || !fid) {
      return NextResponse.json(
        { error: 'questionId and fid are required' },
        { status: 400 }
      );
    }

    const feedback = await getUserFeedback(parseInt(questionId), fid);
    
    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error retrieving user feedback:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    );
  }
}

// POST: Submit new feedback
export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    
    const { questionId, fid, wasHelpful, aiAnswered, improvementSuggestion } = await request.json();

    // Validation
    if (!questionId || !fid || !wasHelpful) {
      return NextResponse.json(
        { error: 'questionId, fid, and wasHelpful are required' },
        { status: 400 }
      );
    }

    if (!['yes', 'no', 'somewhat'].includes(wasHelpful)) {
      return NextResponse.json(
        { error: 'wasHelpful must be yes, no, or somewhat' },
        { status: 400 }
      );
    }

    if (typeof aiAnswered !== 'boolean') {
      return NextResponse.json(
        { error: 'aiAnswered must be a boolean' },
        { status: 400 }
      );
    }

    // Rate limiting
    if (isRateLimited(fid)) {
      return NextResponse.json(
        { error: 'Too many feedback submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate improvement suggestion length
    if (improvementSuggestion && improvementSuggestion.length > 500) {
      return NextResponse.json(
        { error: 'Improvement suggestion must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Log the feedback
    await logUserFeedback(
      parseInt(questionId),
      fid,
      wasHelpful,
      aiAnswered,
      improvementSuggestion
    );

    return NextResponse.json({ 
      success: true,
      message: 'Feedback submitted successfully' 
    });

  } catch (error) {
    console.error('Error submitting user feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}