import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: nftId } = await params;
    
    // Extract rarity from ID or use default
    const rarity = extractRarityFromId(nftId);
    
    // Generate SVG image for the NFT
    const svgImage = generateNFTImage(nftId, rarity);
    
    return new NextResponse(svgImage, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('NFT image generation error:', error);
    
    // Return a simple error SVG
    const errorSvg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#f3f4f6"/>
        <text x="200" y="200" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="16">
          NFT Image Generation Error
        </text>
      </svg>
    `;
    
    return new NextResponse(errorSvg, {
      status: 500,
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

function extractRarityFromId(nftId: string): string {
  // Simple rarity extraction - in production this would come from database
  const hash = nftId.slice(-2);
  const hashNum = parseInt(hash, 16);
  
  if (hashNum > 250) return 'platinum';
  if (hashNum > 230) return 'gold';
  if (hashNum > 180) return 'silver';
  return 'bronze';
}

function generateNFTImage(nftId: string, rarity: string): string {
  const rarityColors = {
    bronze: { primary: '#CD7F32', secondary: '#A0522D', bg: '#FDF6E3' },
    silver: { primary: '#C0C0C0', secondary: '#A9A9A9', bg: '#F8F9FA' },
    gold: { primary: '#FFD700', secondary: '#FFA500', bg: '#FFFEF7' },
    platinum: { primary: '#E5E4E2', secondary: '#B8B6B0', bg: '#F0F0F0' }
  };
  
  const colors = rarityColors[rarity as keyof typeof rarityColors] || rarityColors.bronze;
  const displayId = nftId.slice(-6).toUpperCase();
  
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:0.1" />
        </linearGradient>
        
        <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${colors.secondary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:1" />
        </linearGradient>
        
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="400" height="400" fill="url(#bgGradient)" rx="20"/>
      
      <!-- Border -->
      <rect x="10" y="10" width="380" height="380" fill="none" 
            stroke="url(#borderGradient)" stroke-width="4" rx="15"/>
      
      <!-- Header -->
      <rect x="30" y="30" width="340" height="60" fill="${colors.primary}" opacity="0.1" rx="10"/>
      <text x="200" y="55" text-anchor="middle" fill="${colors.primary}" 
            font-family="Arial, sans-serif" font-size="18" font-weight="bold">
        ORTHOIQ RESEARCH
      </text>
      <text x="200" y="75" text-anchor="middle" fill="${colors.secondary}" 
            font-family="Arial, sans-serif" font-size="14">
        ${rarity.toUpperCase()} EDITION
      </text>
      
      <!-- Medical Icon -->
      <g transform="translate(150, 120)">
        <circle cx="50" cy="50" r="40" fill="${colors.primary}" opacity="0.2"/>
        <path d="M35 50 L65 50 M50 35 L50 65" stroke="${colors.primary}" 
              stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>
      </g>
      
      <!-- NFT ID -->
      <text x="200" y="240" text-anchor="middle" fill="${colors.primary}" 
            font-family="monospace" font-size="24" font-weight="bold">
        #${displayId}
      </text>
      
      <!-- Research Details -->
      <rect x="50" y="260" width="300" height="80" fill="white" opacity="0.8" rx="8"/>
      <text x="70" y="285" fill="${colors.secondary}" font-family="Arial, sans-serif" font-size="12">
        • AI-Synthesized Medical Research
      </text>
      <text x="70" y="305" fill="${colors.secondary}" font-family="Arial, sans-serif" font-size="12">
        • Orthopedic &amp; Sports Medicine Focus
      </text>
      <text x="70" y="325" fill="${colors.secondary}" font-family="Arial, sans-serif" font-size="12">
        • Evidence-Based Clinical Insights
      </text>
      
      <!-- Footer -->
      <text x="200" y="370" text-anchor="middle" fill="${colors.primary}" 
            font-family="Arial, sans-serif" font-size="10" opacity="0.8">
        Generated by Claude AI • Verified by Medical Professionals
      </text>
      
      <!-- Rarity Badge -->
      <circle cx="350" cy="50" r="25" fill="${colors.primary}" opacity="0.9"/>
      <text x="350" y="55" text-anchor="middle" fill="white" 
            font-family="Arial, sans-serif" font-size="10" font-weight="bold">
        ${rarity[0].toUpperCase()}
      </text>
    </svg>
  `;
  
  return svg.trim();
}