import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedAnalytics } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const analytics = await getEnhancedAnalytics();

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error getting enhanced analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics data' },
      { status: 500 }
    );
  }
}