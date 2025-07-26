import { NextRequest, NextResponse } from 'next/server';
import { scheduleRateLimitResetNotifications } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by a cron job at midnight UTC
    // You can also set up Vercel cron jobs to call this automatically
    
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Verify authorization if cron secret is set
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily reset notifications...');
    await scheduleRateLimitResetNotifications();
    
    return NextResponse.json({
      success: true,
      message: 'Daily reset notifications sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending daily reset notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send reset notifications' },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  try {
    console.log('Manual trigger of daily reset notifications...');
    await scheduleRateLimitResetNotifications();
    
    return NextResponse.json({
      success: true,
      message: 'Daily reset notifications sent successfully (manual trigger)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending daily reset notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send reset notifications' },
      { status: 500 }
    );
  }
}