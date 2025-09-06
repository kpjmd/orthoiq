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
      metadata,
      prescriptionMetadata
    } = body;

    if (!question || !response) {
      return NextResponse.json(
        { error: 'Question and response are required' },
        { status: 400 }
      );
    }

    // Store share data in database with inquiry, keyPoints, and prescription metadata
    const shareId = await createShare(
      'response',
      question,
      response,
      confidence,
      { 
        inquiry: inquiry || null,
        keyPoints: keyPoints || null,
        metadata: metadata || {},
        prescriptionId: prescriptionMetadata?.id || null,
        prescriptionRarity: prescriptionMetadata?.rarity || null,
        prescriptionTheme: prescriptionMetadata?.theme || null,
        prescriptionHash: prescriptionMetadata?.verificationHash || null
      }, // Include all prescription metadata
      {}, // No farcaster-specific data for response shares
      30 // Expire in 30 days
    );

    // Create clean share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://orthoiq.vercel.app'}/share/${shareId}`;

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
      metadata: {
        question: question.substring(0, 200),
        response: response.substring(0, 300),
        confidence,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating response share:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}