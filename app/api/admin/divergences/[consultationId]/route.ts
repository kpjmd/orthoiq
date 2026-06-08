import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getCoordinationDivergences } from '@/lib/database';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  const authErr = await requireAdmin(); if (authErr) return authErr;
  try {
    const { consultationId } = await params;
    if (!consultationId) {
      return NextResponse.json({ error: 'consultationId is required' }, { status: 400 });
    }
    const divergences = await getCoordinationDivergences(consultationId);
    return NextResponse.json({ consultationId, divergences });
  } catch (error) {
    console.error('Error fetching consultation divergences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultation divergences' },
      { status: 500 }
    );
  }
}
