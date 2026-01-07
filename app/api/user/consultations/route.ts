import { NextRequest, NextResponse } from 'next/server';
import { getUserConsultations } from '@/lib/database';

/**
 * GET /api/user/consultations
 * Get user's consultation history by FID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    const consultations = await getUserConsultations(fid, limit);

    return NextResponse.json({
      fid,
      consultations,
      total: consultations.length
    });
  } catch (error) {
    console.error('Error getting user consultations:', error);
    return NextResponse.json(
      { error: 'Failed to get user consultations' },
      { status: 500 }
    );
  }
}
