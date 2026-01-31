import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const fid = request.nextUrl.searchParams.get('fid');

    if (!fid) {
      return NextResponse.json({ error: 'FID required' }, { status: 400 });
    }

    // Check if user has ever added the app (any tokens, enabled or disabled)
    const tokens = await sql`
      SELECT COUNT(*) as count FROM notification_tokens
      WHERE fid = ${fid}
    `;

    const hasAddedApp = parseInt(tokens[0].count) > 0;

    // Check if notifications are currently enabled
    const enabledTokens = await sql`
      SELECT COUNT(*) as count FROM notification_tokens
      WHERE fid = ${fid} AND enabled = true
    `;

    const notificationsEnabled = parseInt(enabledTokens[0].count) > 0;

    return NextResponse.json({
      appAdded: hasAddedApp,
      notificationsEnabled
    });
  } catch (error) {
    console.error('Failed to check app status:', error);
    return NextResponse.json(
      { error: 'Failed to check app status' },
      { status: 500 }
    );
  }
}
