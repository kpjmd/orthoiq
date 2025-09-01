import { NextRequest, NextResponse } from 'next/server';
import { createShare } from '../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      question, 
      response, 
      confidence = 95,
      inquiry,
      keyPoints,
      prescriptionMetadata
    } = body;

    if (!question || !response) {
      return NextResponse.json(
        { error: 'Question and response are required' },
        { status: 400 }
      );
    }

    // Store prescription share data in database
    const shareId = await createShare(
      'prescription', // Different type for prescription-only shares
      question,
      response,
      confidence,
      { 
        inquiry: inquiry || null,
        keyPoints: keyPoints || null,
        prescriptionId: prescriptionMetadata?.id || null,
        rarity: prescriptionMetadata?.rarity || null,
        theme: prescriptionMetadata?.theme || null,
        verificationHash: prescriptionMetadata?.verificationHash || null
      },
      {}, // No farcaster-specific data for prescription shares
      30 // Expire in 30 days
    );

    // Create clean share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://orthoiq.vercel.app'}/share/${shareId}?view=prescription`;

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
      type: 'prescription',
      metadata: {
        question: question.substring(0, 200),
        inquiry: inquiry || 'Medical consultation',
        rarity: prescriptionMetadata?.rarity || 'common',
        confidence,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating prescription share:', error);
    return NextResponse.json(
      { error: 'Failed to create prescription share link' },
      { status: 500 }
    );
  }
}