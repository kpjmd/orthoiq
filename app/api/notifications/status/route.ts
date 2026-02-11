import { NextRequest, NextResponse } from 'next/server';
import { checkNotificationStatus } from '@/lib/notifications';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const fid = request.nextUrl.searchParams.get('fid');

    if (!fid) {
      return NextResponse.json(
        { error: 'FID required' },
        { status: 400 }
      );
    }

    const status = await checkNotificationStatus(fid);

    if (status.error) {
      console.error(`[NotificationStatus] DB error for FID ${fid}:`, status.error);
      return NextResponse.json(
        { error: 'Database error checking notification status' },
        { status: 500 }
      );
    }

    // Include last update timestamp for debugging
    const tokens = await sql`
      SELECT enabled, updated_at
      FROM notification_tokens
      WHERE fid = ${fid}
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    return NextResponse.json({
      enabled: status.enabled,
      tokenCount: status.tokenCount,
      lastUpdate: tokens[0]?.updated_at || null
    });
  } catch (error) {
    console.error('[NotificationStatus] Failed to check notification status:', error);
    return NextResponse.json(
      { error: 'Failed to check notification status' },
      { status: 500 }
    );
  }
}
