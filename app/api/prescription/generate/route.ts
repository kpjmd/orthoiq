import { NextRequest, NextResponse } from 'next/server';
import { storePrescription } from '@/lib/database';
import { generateNFTMetadata } from '@/lib/exportUtils';
import { calculateRarity, calculateQuestionComplexity, generateMetadata } from '@/lib/prescriptionUtils';
import { PrescriptionData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      questionId,
      question, 
      response, 
      confidence,
      fid,
      inquiry,
      keyPoints
    } = body;

    if (!questionId || !question || !response || !fid) {
      return NextResponse.json(
        { error: 'Question ID, question, response, and FID are required' },
        { status: 400 }
      );
    }

    // Generate prescription metadata
    const prescriptionData = {
      userQuestion: question,
      claudeResponse: response,
      confidence: confidence || 0.85,
      fid,
      caseId: `api-${Date.now()}`,
      timestamp: new Date().toISOString(),
      inquiry,
      keyPoints
    };

    const complexity = calculateQuestionComplexity(question);
    const rarity = calculateRarity(confidence || 0.85, complexity);
    const metadata = generateMetadata(prescriptionData, rarity);

    // Generate watermark type based on rarity
    const watermarkType = metadata.rarity === 'common' ? 'none' : 
                         metadata.rarity === 'uncommon' ? 'medical_pattern' :
                         metadata.rarity === 'rare' ? 'gold_caduceus' : 'holographic';

    // Generate NFT metadata
    const nftMetadata = generateNFTMetadata(prescriptionData, metadata);

    // Store prescription in database
    const prescriptionDbId = await storePrescription(
      metadata.id,
      parseInt(questionId),
      fid,
      metadata.rarity,
      metadata.theme,
      watermarkType,
      nftMetadata,
      metadata.verificationHash
    );

    return NextResponse.json({
      success: true,
      prescriptionId: metadata.id,
      metadata,
      nftMetadata,
      watermarkType,
      dbId: prescriptionDbId
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating prescription:', error);
    return NextResponse.json(
      { error: 'Failed to generate prescription' },
      { status: 500 }
    );
  }
}