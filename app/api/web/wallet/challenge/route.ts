import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAddress } from 'viem';
import { getSession } from '@/lib/session';
import { getSql } from '@/lib/database';
import { buildSiweMessage, normalizeAddress } from '@/lib/walletSiwe';
import { WalletChallengePurpose } from '@/lib/webUserDb';

const ALLOWED_PURPOSES: WalletChallengePurpose[] = ['connect', 'verify', 'backfill'];
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

const STATEMENT_FOR_PURPOSE: Record<WalletChallengePurpose, string> = {
  connect: 'Sign in to OrthoIQ with your wallet. This creates your profile.',
  verify: 'Confirm wallet ownership to link this wallet to your OrthoIQ profile.',
  backfill: 'Confirm wallet ownership to attach your earlier OrthoIQ consultations to your profile.',
};

export async function POST(request: NextRequest) {
  try {
    const { address, purpose } = await request.json();

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'A valid wallet address is required', code: 'invalid_address' },
        { status: 400 }
      );
    }

    if (!purpose || !ALLOWED_PURPOSES.includes(purpose)) {
      return NextResponse.json(
        { error: 'Invalid purpose', code: 'invalid_purpose' },
        { status: 400 }
      );
    }

    const session = await getSession();
    if ((purpose === 'verify' || purpose === 'backfill') && !session) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'unauthenticated' },
        { status: 401 }
      );
    }
    if (purpose === 'connect' && session) {
      return NextResponse.json(
        { error: 'Already signed in — use verify instead', code: 'already_signed_in' },
        { status: 400 }
      );
    }

    const host = request.headers.get('host') || 'orthoiq.com';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const issuedAt = new Date().toISOString();
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    const message = buildSiweMessage({
      domain: host,
      uri: `${proto}://${host}`,
      address,
      nonce,
      issuedAt,
      statement: STATEMENT_FOR_PURPOSE[purpose as WalletChallengePurpose],
    });

    const sql = getSql();
    await sql`
      INSERT INTO wallet_challenges (nonce, wallet_address, web_user_id, purpose, message, expires_at)
      VALUES (
        ${nonce},
        ${normalizeAddress(address)},
        ${session?.user.id ?? null},
        ${purpose},
        ${message},
        ${expiresAt}
      )
    `;

    return NextResponse.json({
      nonce,
      message,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in wallet/challenge:', error);
    return NextResponse.json(
      { error: 'Failed to create challenge', code: 'unexpected' },
      { status: 500 }
    );
  }
}
