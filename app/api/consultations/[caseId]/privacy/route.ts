import { NextRequest, NextResponse } from 'next/server';
import { getConsultation, updateConsultationPrivacy } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fid, isPrivate } = body;

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    if (typeof isPrivate !== 'boolean') {
      return NextResponse.json(
        { error: 'isPrivate must be a boolean' },
        { status: 400 }
      );
    }

    // Verify user is consultation owner
    const consultation = await getConsultation(caseId);
    if (!consultation) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // Check ownership - fid must match
    if (consultation.fid !== fid) {
      return NextResponse.json(
        { error: 'Unauthorized - only the consultation owner can change privacy settings' },
        { status: 403 }
      );
    }

    // Update privacy setting
    await updateConsultationPrivacy(caseId, isPrivate);

    return NextResponse.json({
      success: true,
      caseId,
      isPrivate,
      message: isPrivate
        ? 'Consultation is now private (only you can view)'
        : 'Consultation is now public (anyone with link can view)'
    });

  } catch (error) {
    console.error('Error updating consultation privacy:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current privacy status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    const consultation = await getConsultation(caseId);
    if (!consultation) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      caseId,
      isPrivate: consultation.is_private || false,
      ownerFid: consultation.fid
    });

  } catch (error) {
    console.error('Error getting consultation privacy:', error);
    return NextResponse.json(
      { error: 'Failed to get privacy settings' },
      { status: 500 }
    );
  }
}
