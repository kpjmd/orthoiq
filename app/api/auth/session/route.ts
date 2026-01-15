import { NextRequest, NextResponse } from 'next/server';
import { getSession, validateSessionFromHeader } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // First try to get session from cookie (for magic link flow)
    let sessionData = await getSession();

    // Fall back to Authorization header (for localStorage-based auth)
    if (!sessionData) {
      const authHeader = request.headers.get('Authorization');
      sessionData = await validateSessionFromHeader(authHeader);
    }

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        emailVerified: sessionData.user.email_verified,
        dailyQuestionCount: sessionData.user.daily_question_count,
        createdAt: sessionData.user.created_at
      },
      session: {
        id: sessionData.session.id,
        expiresAt: sessionData.session.expires_at,
        lastActive: sessionData.session.last_active
      },
      // Return session token so frontend can store it in localStorage
      sessionToken: sessionData.session.session_token
    });

  } catch (error) {
    console.error('Error in session check:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
