import { NextRequest, NextResponse } from 'next/server';
import { trackPrescriptionDownload } from '@/lib/database';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fid, downloadType = 'image' } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Prescription ID is required' },
        { status: 400 }
      );
    }

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    if (!['image', 'pdf', 'nft_metadata'].includes(downloadType)) {
      return NextResponse.json(
        { error: 'Invalid download type' },
        { status: 400 }
      );
    }

    // Get user agent and create IP hash for privacy
    const userAgent = request.headers.get('user-agent') || undefined;
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16);

    await trackPrescriptionDownload(id, fid, downloadType, userAgent, ipHash);

    return NextResponse.json({
      success: true,
      message: 'Download tracked successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error tracking prescription download:', error);
    return NextResponse.json(
      { error: 'Failed to track download' },
      { status: 500 }
    );
  }
}