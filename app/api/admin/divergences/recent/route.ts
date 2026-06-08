import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getRecentDivergences } from '@/lib/database';

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);
    const divergences = await getRecentDivergences(limit);
    return NextResponse.json({ divergences });
  } catch (error) {
    console.error('Error fetching recent divergences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent divergences' },
      { status: 500 }
    );
  }
}
