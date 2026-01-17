import { NextRequest, NextResponse } from 'next/server';
import { getPlatformRateLimitStatus } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    // Get session ID and email verification status from headers
    const sessionId = request.headers.get('x-session-id');
    const isEmailVerified = request.headers.get('x-email-verified') === 'true';

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Use session ID as identifier (matches /api/claude format)
    const identifier = sessionId;

    // Default limit: 1 for unverified, 10 for verified
    const defaultLimit = isEmailVerified ? 10 : 1;

    // Get web usage status (doesn't increment)
    const rateLimit = await getPlatformRateLimitStatus(
      identifier,
      'web',
      'fast',
      'basic',
      isEmailVerified  // Pass email verification status
    );

    return NextResponse.json({
      questionsAsked: (rateLimit.total || defaultLimit) - (rateLimit.remaining ?? defaultLimit),
      questionsRemaining: rateLimit.remaining ?? defaultLimit,
      isLimitReached: !rateLimit.allowed,
      total: rateLimit.total || defaultLimit,
      isVerified: isEmailVerified
    });
  } catch (error) {
    console.error('Error fetching web limit:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch web usage limit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
