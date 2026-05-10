import { NextResponse } from 'next/server';
import { getRevenueProjections } from '@/lib/database';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    const analytics = await getRevenueProjections();
    
    return NextResponse.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error('Error fetching revenue projections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue projections' },
      { status: 500 }
    );
  }
}