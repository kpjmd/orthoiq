import { NextRequest, NextResponse } from 'next/server';
import { verifyWebUser, getWebUserByEmail } from '@/lib/database';
import { createSessionCookie, getSessionCookieConfig } from '@/lib/session';
import { sendWelcomeEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      // Redirect to home with error
      return NextResponse.redirect(
        new URL('/?auth_error=missing_token', request.url)
      );
    }

    // Verify the token and get user
    const user = await verifyWebUser(token);

    if (!user) {
      // Token expired or invalid
      return NextResponse.redirect(
        new URL('/?auth_error=invalid_token', request.url)
      );
    }

    // Create session
    const sessionResult = await createSessionCookie(user.id);

    if (!sessionResult) {
      return NextResponse.redirect(
        new URL('/?auth_error=session_failed', request.url)
      );
    }

    // Send welcome email for first-time verified users
    // (The verification already happened, this is just a welcome)
    sendWelcomeEmail(user.email).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Create response with session cookie
    const response = NextResponse.redirect(
      new URL('/?auth_success=true', request.url)
    );

    const cookieConfig = getSessionCookieConfig(
      sessionResult.sessionToken,
      sessionResult.expiresAt
    );

    response.cookies.set(
      cookieConfig.name,
      cookieConfig.value,
      cookieConfig.options
    );

    return response;

  } catch (error) {
    console.error('Error in verify-magic-link:', error);
    return NextResponse.redirect(
      new URL('/?auth_error=unexpected', request.url)
    );
  }
}

// Also support POST for programmatic verification
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the token and get user
    const user = await verifyWebUser(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Create session
    const sessionResult = await createSessionCookie(user.id);

    if (!sessionResult) {
      return NextResponse.json(
        { error: 'Failed to create session. Please try again.' },
        { status: 500 }
      );
    }

    // Send welcome email
    sendWelcomeEmail(user.email).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified
      },
      sessionToken: sessionResult.sessionToken
    });

    const cookieConfig = getSessionCookieConfig(
      sessionResult.sessionToken,
      sessionResult.expiresAt
    );

    response.cookies.set(
      cookieConfig.name,
      cookieConfig.value,
      cookieConfig.options
    );

    return response;

  } catch (error) {
    console.error('Error in verify-magic-link POST:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
