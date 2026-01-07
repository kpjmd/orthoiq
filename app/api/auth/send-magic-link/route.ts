import { NextRequest, NextResponse } from 'next/server';
import { createWebUser, getWebUserByEmail } from '@/lib/database';
import { sendMagicLinkEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if user already exists and is verified
    const existingUser = await getWebUserByEmail(email.toLowerCase());

    // Create or update user with new verification token
    const user = await createWebUser(email.toLowerCase());

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user. Please try again.' },
        { status: 500 }
      );
    }

    // Send magic link email
    const emailResult = await sendMagicLinkEmail(email.toLowerCase(), user.verification_token!);

    if (!emailResult.success) {
      console.error('Failed to send magic link email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    // Return success (don't reveal if user already exists for security)
    return NextResponse.json({
      success: true,
      message: 'Check your email for a sign-in link.',
      isNewUser: !existingUser?.email_verified
    });

  } catch (error) {
    console.error('Error in send-magic-link:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
