import { NextResponse } from 'next/server';
import { getEngagementMetrics } from '@/lib/database';

export async function GET() {
  try {
    const analytics = await getEngagementMetrics();
    
    return NextResponse.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement metrics' },
      { status: 500 }
    );
  }
}