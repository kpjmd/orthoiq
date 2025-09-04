import { NextRequest, NextResponse } from 'next/server';
import { trackPrescriptionShare } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fid, platform, shareUrl } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Prescription ID is required' },
        { status: 400 }
      );
    }

    // Use defaults for missing fields
    const finalFid = fid || 'unknown-user';
    const finalPlatform = platform || 'unified';

    const validPlatforms = ['farcaster', 'twitter', 'facebook', 'telegram', 'email', 'copy_link', 'unified'];
    if (!validPlatforms.includes(finalPlatform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    await trackPrescriptionShare(id, finalFid, finalPlatform, shareUrl);

    return NextResponse.json({
      success: true,
      message: 'Share tracked successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error tracking prescription share:', error);
    return NextResponse.json(
      { error: 'Failed to track share' },
      { status: 500 }
    );
  }
}