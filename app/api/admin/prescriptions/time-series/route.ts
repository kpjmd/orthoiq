import { NextRequest, NextResponse } from 'next/server';
import { getPrescriptionTimeSeries } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const analytics = await getPrescriptionTimeSeries(days);
    
    return NextResponse.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error('Error fetching prescription time series:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prescription time series' },
      { status: 500 }
    );
  }
}