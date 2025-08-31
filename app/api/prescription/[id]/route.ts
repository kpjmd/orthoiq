import { NextRequest, NextResponse } from 'next/server';
import { getPrescription } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Prescription ID is required' },
        { status: 400 }
      );
    }

    const prescription = await getPrescription(id);

    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      prescription: {
        id: prescription.prescription_id,
        questionId: prescription.question_id,
        question: prescription.question,
        response: prescription.response,
        confidence: prescription.confidence,
        fid: prescription.fid,
        rarity: prescription.rarity_type,
        theme: prescription.themeConfig,
        watermarkType: prescription.watermark_type,
        nftMetadata: prescription.nftMetadata,
        verificationHash: prescription.verification_hash,
        shareCount: prescription.share_count,
        mintStatus: prescription.mint_status,
        mdReviewed: prescription.md_reviewed,
        mdReviewerName: prescription.md_reviewer_name,
        mdReviewNotes: prescription.md_review_notes,
        mdReviewedAt: prescription.md_reviewed_at,
        createdAt: prescription.created_at
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting prescription:', error);
    return NextResponse.json(
      { error: 'Failed to get prescription' },
      { status: 500 }
    );
  }
}