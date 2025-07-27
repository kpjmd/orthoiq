import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Check for admin API key from environment
    const adminApiKey = process.env.ADMIN_API_KEY;
    if (!adminApiKey) {
      console.error('ADMIN_API_KEY environment variable not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Validate authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${adminApiKey}`) {
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