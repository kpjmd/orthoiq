import { NextRequest, NextResponse } from 'next/server';
import { hashIP } from '@/lib/webTracking';
import { getPlatformRateLimitStatus } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    // Get session ID from headers
    const sessionId = request.headers.get('x-session-id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Get client IP and hash it
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const ipHash = hashIP(clientIP);

    // Create unique identifier combining session and IP
    const identifier = `${sessionId}:${ipHash}`;

    // Get web usage status (doesn't increment)
    const rateLimit = await getPlatformRateLimitStatus(
      identifier,
      'web',
      'fast',
      'basic'
    );

    return NextResponse.json({
      questionsAsked: (rateLimit.total || 3) - (rateLimit.remaining || 3),
      questionsRemaining: rateLimit.remaining || 3,
      isLimitReached: !rateLimit.allowed,
      total: rateLimit.total || 3
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
