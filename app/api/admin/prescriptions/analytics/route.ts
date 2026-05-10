import { NextResponse } from 'next/server';
import { getPrescriptionAnalytics } from '@/lib/database';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    const analytics = await getPrescriptionAnalytics();
    
    return NextResponse.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error('Error fetching prescription analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prescription analytics' },
      { status: 500 }
    );
  }
}