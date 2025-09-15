import { NextRequest, NextResponse } from 'next/server';
import { getResearchSynthesis } from '@/lib/database';
import { ResearchRarity, ResearchNFTMetadata } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, fid, enrichmentType, title, rarity } = body;

    if (!questionId || !fid || !enrichmentType || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique NFT ID
    const nftId = `nft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create NFT metadata based on rarity
    const rarityTier: ResearchRarity = rarity || 'bronze';
    
    const nftMetadata: ResearchNFTMetadata = {
      id: nftId,
      rarity: rarityTier,
      studyCount: getStudyCountForRarity(rarityTier),
      publicationYears: '2020-2024',
      evidenceLevel: getEvidenceLevelForRarity(rarityTier),
      specialties: ['orthopedics', 'sports-medicine'],
      citationCount: Math.floor(Math.random() * 100) + 10,
      impactFactor: parseFloat((Math.random() * 5 + 1).toFixed(2)),
      clinicalRelevance: Math.floor(Math.random() * 5) + 6,
      timesViewed: 0,
      timesCited: 0,
      mdEndorsements: [],
      researchHash: generateResearchHash(title, rarityTier),
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    // In a real implementation, this would:
    // 1. Store NFT metadata in database
    // 2. Generate actual NFT on blockchain (Base)
    // 3. Upload metadata to IPFS
    // 4. Return mint transaction details

    // For MVP, simulate NFT creation
    const response = {
      success: true,
      nft: {
        id: nftId,
        title: `${title} - ${rarityTier.toUpperCase()} Research`,
        rarity: rarityTier,
        metadata: nftMetadata,
        mintStatus: 'pending',
        estimatedMintTime: '2-3 minutes',
        previewUrl: `/api/research/nft/${nftId}/preview`,
        opensea: {
          url: `https://opensea.io/assets/base/${process.env.NFT_CONTRACT_ADDRESS}/${nftId}`,
          available: false // Will be true after minting
        }
      },
      pricing: getRarityPricing(rarityTier),
      message: `${rarityTier.toUpperCase()} Research NFT queued for minting`
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('NFT generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate NFT' },
      { status: 500 }
    );
  }
}

function getStudyCountForRarity(rarity: ResearchRarity): number {
  switch (rarity) {
    case 'bronze': return Math.floor(Math.random() * 5) + 3;
    case 'silver': return Math.floor(Math.random() * 8) + 8;
    case 'gold': return Math.floor(Math.random() * 10) + 15;
    case 'platinum': return Math.floor(Math.random() * 15) + 25;
    default: return 5;
  }
}

function getEvidenceLevelForRarity(rarity: ResearchRarity): string {
  switch (rarity) {
    case 'bronze': return 'III-IV';
    case 'silver': return 'II-III';
    case 'gold': return 'I-II';
    case 'platinum': return 'I';
    default: return 'III';
  }
}

function generateResearchHash(title: string, rarity: ResearchRarity): string {
  // Simple hash generation for demonstration
  const content = `${title}-${rarity}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function getRarityPricing(rarity: ResearchRarity) {
  const basePrices = {
    bronze: { create: 0, mdReview: 5 },
    silver: { create: 2, mdReview: 10 },
    gold: { create: 5, mdReview: 15 },
    platinum: { create: 10, mdReview: 25 }
  };

  const pricing = basePrices[rarity];

  return {
    createPrice: pricing.create,
    mdReviewPrice: pricing.mdReview,
    totalValue: pricing.create + pricing.mdReview,
    currency: 'USDC',
    estimatedGasFeesBase: 0.005, // ~$0.005 in ETH on Base
    mdReviewAvailable: true,
    mdReviewDescription: `Professional medical review and endorsement for ${rarity} research`
  };
}