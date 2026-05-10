import { NextRequest, NextResponse } from 'next/server';
import { getMDReviewQueue } from '@/lib/database';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    // TODO: Add admin authentication check here
    // For now, we'll allow access but this should be restricted

    const queue = await getMDReviewQueue();

    return NextResponse.json({
      success: true,
      queue,
      count: queue.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting MD review queue:', error);
    return NextResponse.json(
      { error: 'Failed to get MD review queue' },
      { status: 500 }
    );
  }
}