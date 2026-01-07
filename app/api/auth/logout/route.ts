import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromHeader, getSessionCookieDeletionConfig } from '@/lib/session';
import { deleteUserSessions } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const sessionData = await validateSessionFromHeader(authHeader);

    if (sessionData) {
      // Delete all sessions for this user
      await deleteUserSessions(sessionData.user.id);
    }

    // Create response with cookie deletion
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the session cookie
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
