import { NextRequest, NextResponse } from 'next/server';
import { getUserPrescriptions, getUserCollectionSummary } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;
    
    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    const [prescriptions, collectionSummary] = await Promise.all([
      getUserPrescriptions(fid),
      getUserCollectionSummary(fid)
    ]);

    return NextResponse.json({
      success: true,
      fid,
      collection: collectionSummary,
      prescriptions
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting user prescriptions:', error);
    return NextResponse.json(
      { error: 'Failed to get user prescriptions' },
      { status: 500 }
    );
  }
}