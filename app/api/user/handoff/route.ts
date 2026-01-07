import { NextRequest, NextResponse } from 'next/server';
import { createPlatformHandoff, getPlatformHandoff, claimPlatformHandoff } from '@/lib/database';

/**
 * POST /api/user/handoff
 * Create a handoff link for web-to-miniapp transition
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fid, consultationId } = body;

    if (!email && !fid) {
      return NextResponse.json(
        { error: 'Either email or FID is required' },
        { status: 400 }
      );
    }

    const handoffLink = await createPlatformHandoff({
      email,
      fid,
      consultationId
    });

    return NextResponse.json({
      success: true,
      handoff_link: handoffLink,
      message: 'Continue your consultation in the OrthoIQ mini app for full features including milestone tracking and token rewards.'
    });
  } catch (error) {
    console.error('Error creating handoff link:', error);
    return NextResponse.json(
      { error: 'Failed to create handoff link' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/handoff
 * Get handoff details by handoff ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handoffId = searchParams.get('handoff_id');

    if (!handoffId) {
      return NextResponse.json(
        { error: 'Handoff ID is required' },
        { status: 400 }
      );
    }

    const handoff = await getPlatformHandoff(handoffId);

    if (!handoff) {
      return NextResponse.json(
        { error: 'Handoff not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      handoff_id: handoff.handoff_id,
      consultation_id: handoff.consultation_id,
      claimed: handoff.claimed,
      expires_at: handoff.expires_at
    });
  } catch (error) {
    console.error('Error getting handoff:', error);
    return NextResponse.json(
      { error: 'Failed to get handoff details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/handoff
 * Claim a handoff (mark as used)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { handoff_id, fid } = body;

    if (!handoff_id || !fid) {
      return NextResponse.json(
        { error: 'Handoff ID and FID are required' },
        { status: 400 }
      );
    }

    const claimed = await claimPlatformHandoff(handoff_id, fid);

    if (!claimed) {
      return NextResponse.json(
        { error: 'Handoff not found, already claimed, or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      consultation_id: claimed.consultation_id,
      message: 'Handoff claimed successfully. Welcome to the mini app!'
    });
  } catch (error) {
    console.error('Error claiming handoff:', error);
    return NextResponse.json(
      { error: 'Failed to claim handoff' },
      { status: 500 }
    );
  }
}
