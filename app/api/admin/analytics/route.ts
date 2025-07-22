import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Simple auth check - in production use proper authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== 'Bearer admin-secret') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const analytics = await getAnalytics();
    
    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}