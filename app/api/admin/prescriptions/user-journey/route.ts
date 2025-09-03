import { NextResponse } from 'next/server';
import { getUserJourneyAnalytics } from '@/lib/database';

export async function GET() {
  try {
    const analytics = await getUserJourneyAnalytics();
    
    return NextResponse.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error('Error fetching user journey analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user journey analytics' },
      { status: 500 }
    );
  }
}