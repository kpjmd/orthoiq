import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const question = searchParams.get('question') || 'Ask Your Orthopedic Question';
    const response = searchParams.get('response') || 'Get expert AI-powered orthopedic guidance';
    const confidence = searchParams.get('confidence') || '95';

    // Create SVG string for the og-image (3:2 aspect ratio - 1200x800)
    const svgContent = `
      <svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="800" fill="url(#bg)" />
        
        <!-- Logo Area -->
        <circle cx="150" cy="150" r="60" fill="white" opacity="0.2" />
        <text x="150" y="165" text-anchor="middle" fill="white" font-size="48" font-weight="bold">🦴</text>
        
        <!-- Title -->
        <text x="250" y="130" fill="white" font-size="56" font-weight="bold" font-family="system-ui, sans-serif">OrthoIQ</text>
        <text x="250" y="180" fill="white" opacity="0.9" font-size="28" font-family="system-ui, sans-serif">AI Orthopedic Expert</text>
        
        <!-- Question Section -->
        <rect x="80" y="250" width="1040" height="160" rx="20" fill="white" opacity="0.15" />
        <text x="120" y="290" fill="white" font-size="24" font-weight="600" font-family="system-ui, sans-serif">Question:</text>
        <text x="120" y="330" fill="white" font-size="20" font-family="system-ui, sans-serif" opacity="0.95">
          ${(question.length > 100 ? question.substring(0, 100) + '...' : question).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </text>
        
        <!-- Response Section -->
        <rect x="80" y="440" width="1040" height="200" rx="20" fill="white" opacity="0.15" />
        <text x="120" y="480" fill="white" font-size="24" font-weight="600" font-family="system-ui, sans-serif">AI Response:</text>
        <text x="120" y="520" fill="white" font-size="18" font-family="system-ui, sans-serif" opacity="0.95">
          ${(response.length > 150 ? response.substring(0, 150) + '...' : response).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </text>
        
        <!-- Confidence Badge -->
        <rect x="120" y="670" width="200" height="40" rx="20" fill="white" opacity="0.2" />
        <text x="220" y="695" text-anchor="middle" fill="white" font-size="18" font-weight="600" font-family="system-ui, sans-serif">Confidence: ${confidence}%</text>
        
        <!-- Call to Action -->
        <rect x="850" y="660" width="270" height="60" rx="30" fill="white" opacity="0.9" />
        <text x="985" y="700" text-anchor="middle" fill="#1e3a8a" font-size="22" font-weight="700" font-family="system-ui, sans-serif">Ask Your Question</text>
        
        <!-- Footer -->
        <text x="600" y="760" text-anchor="middle" fill="white" opacity="0.7" font-size="16" font-family="system-ui, sans-serif">by Dr. KPJMD</text>
      </svg>
    `;

    return new NextResponse(svgContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error generating og-image:', error);
    
    // Fallback simple SVG
    const fallbackSvg = `
      <svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="fallback-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#fallback-bg)" />
        <text x="600" y="300" text-anchor="middle" fill="white" font-size="96">🦴</text>
        <text x="600" y="420" text-anchor="middle" fill="white" font-size="72" font-weight="bold" font-family="system-ui, sans-serif">OrthoIQ</text>
        <text x="600" y="480" text-anchor="middle" fill="white" opacity="0.9" font-size="32" font-family="system-ui, sans-serif">AI Orthopedic Expert</text>
      </svg>
    `;
    
    return new NextResponse(fallbackSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}