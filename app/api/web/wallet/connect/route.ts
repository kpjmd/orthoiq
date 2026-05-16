import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, getSessionCookieConfig } from '@/lib/session';
import { verifySiwe } from '@/lib/walletSiwe';
import { consumeWalletChallenge, getOrCreateWalletWebUser } from '@/lib/webUserDb';

export async function POST(request: NextRequest) {
  try {
    const { nonce, signature } = await request.json();

    if (!nonce || !signature) {
      return NextResponse.json(
        { error: 'nonce and signature are required', code: 'invalid_request' },
        { status: 400 }
      );
    }

    const challenge = await consumeWalletChallenge(nonce);
    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge expired or already used', code: 'challenge_invalid' },
        { status: 400 }
      );
    }

    if (challenge.purpose !== 'connect') {
      return NextResponse.json(
        { error: 'Wrong challenge purpose for this endpoint', code: 'wrong_purpose' },
        { status: 400 }
      );
    }

    const host = request.headers.get('host') || 'orthoiq.com';
    const verified = await verifySiwe({
      message: challenge.message,
      signature,
      expectedAddress: challenge.wallet_address,
      expectedNonce: nonce,
      expectedDomain: host,
    });

    if (!verified.ok) {
      return NextResponse.json(
        { error: 'Signature verification failed', code: verified.reason },
        { status: 401 }
      );
    }

    const webUser = await getOrCreateWalletWebUser(challenge.wallet_address);
    const sessionResult = await createSessionCookie(webUser.id);
    if (!sessionResult) {
      return NextResponse.json(
        { error: 'Failed to create session', code: 'session_failed' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      webUser: {
        id: webUser.id,
        email: webUser.email,
        walletAddress: webUser.wallet_address,
        walletVerified: true,
      },
    });

    const cookieConfig = getSessionCookieConfig(
      sessionResult.sessionToken,
      sessionResult.expiresAt
    );
    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options);

    return response;
  } catch (error) {
    console.error('Error in wallet/connect:', error);
    return NextResponse.json(
      { error: 'Connect failed', code: 'unexpected' },
      { status: 500 }
    );
  }
}
