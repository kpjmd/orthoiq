import { NextResponse } from 'next/server';
import { getSession, getSessionCookieDeletionConfig } from '@/lib/session';
import { deleteUserSessions } from '@/lib/database';

export async function POST() {
  try {
    const sessionData = await getSession();

    if (sessionData) {
      await deleteUserSessions(sessionData.user.id);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    const cookieConfig = getSessionCookieDeletionConfig();
    response.cookies.set(
      cookieConfig.name,
      cookieConfig.value,
      cookieConfig.options
    );

    return response;

  } catch (error) {
    console.error('Error in logout:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
