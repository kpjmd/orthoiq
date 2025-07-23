import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const question = searchParams.get('question') || 'Orthopedic Question';
    const response = searchParams.get('response') || 'AI Response';
    const confidence = searchParams.get('confidence') || '95';
    
    // Truncate for display
    const truncatedQuestion = question.length > 100 ? question.substring(0, 100) + '...' : question;
    const truncatedResponse = response.length > 200 ? response.substring(0, 200) + '...' : response;

    // For now, return a simple SVG image
    const svgImage = `
      <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e3a8a"/>
            <stop offset="100%" stop-color="#3b82f6"/>
          </linearGradient>
        </defs>
        
        <rect width="1200" height="800" fill="url(#bg)"/>
        
        <rect x="100" y="100" width="1000" height="600" fill="white" rx="20"/>
        
        <text x="150" y="200" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#1e3a8a">🦴 OrthoIQ</text>
        <text x="150" y="240" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">Premier Medical AI on Farcaster</text>
        
        <text x="150" y="320" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#3b82f6">Q:</text>
        <foreignObject x="200" y="295" width="850" height="80">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; font-size: 18px; color: #374151; line-height: 1.4;">
            ${truncatedQuestion}
          </div>
        </foreignObject>
        
        <text x="150" y="420" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#10b981">A:</text>
        <foreignObject x="200" y="395" width="850" height="120">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; font-size: 16px; color: #4b5563; line-height: 1.5;">
            ${truncatedResponse}
          </div>
        </foreignObject>
        
        <text x="150" y="650" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">🔬 AI Confidence: ${confidence}%</text>
        <text x="950" y="650" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">by Dr. KPJMD</text>
      </svg>
    `;

    return new Response(svgImage, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error generating embed image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}