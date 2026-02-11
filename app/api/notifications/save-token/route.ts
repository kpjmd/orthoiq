import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { fid, token, url } = await request.json();

    if (!fid || !token || !url) {
      return NextResponse.json(
        { error: 'Missing required fields: fid, token, url' },
        { status: 400 }
      );
    }

    const fidString = typeof fid === 'number' ? fid.toString() : fid;

    // Disable any existing tokens for this user
    await sql`
      UPDATE notification_tokens
      SET enabled = false
      WHERE fid = ${fidString}
    `;

    // Upsert the new token
    await sql`
      INSERT INTO notification_tokens (fid, token, url, enabled, created_at, updated_at)
      VALUES (${fidString}, ${token}, ${url}, true, NOW(), NOW())
      ON CONFLICT (fid, token)
      DO UPDATE SET
        url = ${url},
        enabled = true,
        updated_at = NOW()
    `;

    console.log(`[SaveToken] Token saved directly for FID ${fidString}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SaveToken] Failed to save token:', error);
    return NextResponse.json(
      { error: 'Failed to save notification token' },
      { status: 500 }
    );
  }
}
