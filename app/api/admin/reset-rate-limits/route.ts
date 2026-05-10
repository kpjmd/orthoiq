import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  const adminKey = req.headers.get('x-admin-key');
  if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sql = neon(process.env.DATABASE_URL!);

  if (body.sessionId) {
    await sql`DELETE FROM web_rate_limits WHERE session_id = ${body.sessionId}`;
    return NextResponse.json({ cleared: body.sessionId });
  }

  // Clear all rate limits
  const result = await sql`DELETE FROM web_rate_limits RETURNING session_id`;
  return NextResponse.json({ cleared: 'all', count: result.length });
}
