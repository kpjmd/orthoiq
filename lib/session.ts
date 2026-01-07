import { cookies } from 'next/headers';
import {
  getWebSessionByToken,
  updateSessionActivity,
  createWebSession,
  deleteUserSessions,
  WebUser,
  WebSession
} from './database';

// Session configuration
const SESSION_COOKIE_NAME = 'orthoiq_session';
const SESSION_DURATION_DAYS = 90; // For milestone journey support

export interface SessionData {
  session: WebSession;
  user: WebUser;
}

/**
 * Get the current session from cookies (server-side)
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return null;
    }

    const sessionData = await getWebSessionByToken(sessionToken);

    if (!sessionData) {
      return null;
    }

    // Update session activity
    await updateSessionActivity(sessionData.id);

    return {
      session: {
        id: sessionData.id,
        session_token: sessionData.session_token,
        web_user_id: sessionData.web_user_id,
        expires_at: sessionData.expires_at,
        created_at: sessionData.created_at,
        last_active: sessionData.last_active
      },
      user: sessionData.user
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Create a new session and set the cookie (for API routes)
 */
export async function createSessionCookie(webUserId: string): Promise<{
  sessionToken: string;
  expiresAt: Date;
} | null> {
  try {
    const session = await createWebSession(webUserId);

    if (!session) {
      return null;
    }

    return {
      sessionToken: session.session_token,
      expiresAt: session.expires_at
    };
  } catch (error) {
    console.error('Error creating session cookie:', error);
    return null;
  }
}

/**
 * Clear session (logout)
 */
export async function clearSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      const sessionData = await getWebSessionByToken(sessionToken);
      if (sessionData) {
        await deleteUserSessions(sessionData.web_user_id);
      }
    }

    // Note: Cookie deletion should be done in the API route response
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Get session cookie configuration for API responses
 */
export function getSessionCookieConfig(sessionToken: string, expiresAt: Date): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    expires: Date;
  };
} {
  return {
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt
    }
  };
}

/**
 * Get cookie deletion config for logout
 */
export function getSessionCookieDeletionConfig(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    expires: Date;
  };
} {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0) // Expire immediately
    }
  };
}

/**
 * Validate session token from request header (for API routes)
 */
export async function validateSessionFromHeader(
  authHeader: string | null
): Promise<SessionData | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const sessionData = await getWebSessionByToken(token);

  if (!sessionData) {
    return null;
  }

  // Update session activity
  await updateSessionActivity(sessionData.id);

  return {
    session: {
      id: sessionData.id,
      session_token: sessionData.session_token,
      web_user_id: sessionData.web_user_id,
      expires_at: sessionData.expires_at,
      created_at: sessionData.created_at,
      last_active: sessionData.last_active
    },
    user: sessionData.user
  };
}

/**
 * Check if user is authenticated (helper for components)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.user.email_verified;
}

/**
 * Get current user (helper for components)
 */
export async function getCurrentUser(): Promise<WebUser | null> {
  const session = await getSession();
  return session?.user || null;
}
