import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromHeader } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const sessionData = await validateSessionFromHeader(authHeader);

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
      }
    });

  } catch (error) {
    console.error('Error in session check:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
