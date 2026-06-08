import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getDivergenceStats } from '@/lib/database';

export async function GET(_request: NextRequest) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    const stats = await getDivergenceStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching divergence stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch divergence stats' },
      { status: 500 }
    );
  }
}
