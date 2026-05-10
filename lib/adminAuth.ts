import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const ADMIN_COOKIE_NAME = 'orthoiq_admin_session';
const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH;
  if (!secret) throw new Error('Admin session secret not configured');
  return secret;
}

export function createAdminToken(): string {
  const secret = getAdminSecret();
  const timestamp = Date.now().toString();
  const rand = randomBytes(8).toString('hex');
  const payload = `admin:${timestamp}:${rand}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

function validateAdminToken(token: string): boolean {
  try {
    const secret = getAdminSecret();
    const lastColon = token.lastIndexOf(':');
    if (lastColon === -1) return false;
    const payload = token.slice(0, lastColon);
    const sig = token.slice(lastColon + 1);

    const parts = payload.split(':');
    if (parts.length !== 3 || parts[0] !== 'admin') return false;
    const timestamp = parseInt(parts[1]);
    if (isNaN(timestamp) || Date.now() - timestamp > ADMIN_SESSION_TTL_MS) return false;

    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function getAdminCookieConfig(token: string) {
  return {
    name: ADMIN_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: ADMIN_SESSION_TTL_MS / 1000,
    },
  };
}

export function getAdminCookieDeletionConfig() {
  return {
    name: ADMIN_COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      expires: new Date(0),
    },
  };
}

// Returns null if authorized, 401 NextResponse if not.
// Usage: const authErr = await requireAdmin(); if (authErr) return authErr;
export async function requireAdmin(): Promise<NextResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token || !validateAdminToken(token)) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: 'Admin authentication failed' }, { status: 500 });
  }
}
