import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { verifySiwe } from '@/lib/walletSiwe';
import {
  consumeWalletChallenge,
  attachWalletToWebUser,
  backfillConsultationsForWallet,
} from '@/lib/webUserDb';

export async function POST(request: NextRequest) {
  try {
    const { nonce, signature, backfill } = await request.json();

    if (!nonce || !signature) {
      return NextResponse.json(
        { error: 'nonce and signature are required', code: 'invalid_request' },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'unauthenticated' },
        { status: 401 }
      );
    }

    const challenge = await consumeWalletChallenge(nonce);
    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge expired or already used', code: 'challenge_invalid' },
        { status: 400 }
      );
    }

    if (challenge.purpose !== 'verify' && challenge.purpose !== 'backfill') {
      return NextResponse.json(
        { error: 'Wrong challenge purpose for this endpoint', code: 'wrong_purpose' },
        { status: 400 }
      );
    }

    // Challenge must be bound to the current session user.
    if (challenge.web_user_id && challenge.web_user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Challenge does not belong to this session', code: 'challenge_mismatch' },
        { status: 403 }
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

    // Attach (or merge) the wallet to the session user.
    const attachResult = await attachWalletToWebUser(session.user.id, challenge.wallet_address);
    if (attachResult.status === 'conflict') {
      return NextResponse.json(
        {
          error: 'This wallet is registered to another account.',
          code: 'wallet_already_claimed',
        },
        { status: 409 }
      );
    }

    let backfilledCount: number | undefined;
    if (backfill === true || challenge.purpose === 'backfill') {
      backfilledCount = await backfillConsultationsForWallet(
        session.user.id,
        challenge.wallet_address
      );
    }

    return NextResponse.json({
      success: true,
      webUser: {
        id: session.user.id,
        email: session.user.email,
        walletAddress: challenge.wallet_address,
        walletVerified: true,
      },
      merged:
        attachResult.status === 'merged'
          ? { from: attachResult.mergedFromId, into: session.user.id }
          : undefined,
      backfilledCount,
    });
  } catch (error) {
    console.error('Error in wallet/verify:', error);
    return NextResponse.json(
      { error: 'Verification failed', code: 'unexpected' },
      { status: 500 }
    );
  }
}
