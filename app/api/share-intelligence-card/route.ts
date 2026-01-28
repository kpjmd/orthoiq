import { NextRequest, NextResponse } from 'next/server';
import { createShare } from '../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      caseId,
      fid,
      tier,
      consensusPercentage,
      participatingCount,
      totalStake,
      primaryPrediction
    } = body;

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    // Store intelligence card share data in database
    const shareId = await createShare(
      'intelligence-card',
      `Intelligence Card #${caseId}`,
      primaryPrediction || 'AI Specialist Consultation',
      consensusPercentage || 75,
      {
        caseId,
        fid: fid || null,
        tier: tier || 'standard',
        consensusPercentage: consensusPercentage || 75,
        participatingCount: participatingCount || 1,
        totalStake: totalStake || 0,
        primaryPrediction: primaryPrediction || null
      },
      {},
      30 // Expire in 30 days
    );

    // Create share and tracking URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://orthoiq.vercel.app';
    const shareUrl = `${baseUrl}/share/${shareId}`;
    const trackUrl = `${baseUrl}/track/${caseId}`;

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
      trackUrl,
      type: 'intelligence-card',
      metadata: {
        caseId,
        tier: tier || 'standard',
        consensusPercentage: consensusPercentage || 75,
        participatingCount: participatingCount || 1,
        totalStake: totalStake || 0,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating intelligence card share:', error);
    return NextResponse.json(
      { error: 'Failed to create intelligence card share link' },
      { status: 500 }
    );
  }
}
