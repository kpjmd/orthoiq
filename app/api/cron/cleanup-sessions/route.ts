import { NextRequest, NextResponse } from 'next/server';
import { deleteExpiredSessions } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cron job to clean up expired web sessions
// Runs daily at 3am UTC
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel sets this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      // In production without proper auth, still allow if from Vercel cron
      const isVercelCron = request.headers.get('x-vercel-cron') === '1';
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[Cron] Starting session cleanup...');

    const deletedCount = await deleteExpiredSessions();

    console.log(`[Cron] Session cleanup complete. Deleted ${deletedCount} expired sessions.`);

    return NextResponse.json({
      success: true,
      message: 'Session cleanup completed',
      deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Cron] Session cleanup failed:', error);
    return NextResponse.json(
      {
        error: 'Session cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
