import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const sessionData = await getSession();

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
