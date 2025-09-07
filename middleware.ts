import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  console.log(`[MIDDLEWARE DEBUG] Processing: ${request.nextUrl.pathname}`);
  
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  
  // Enhanced CSP for Farcaster Mini Apps
  const cspValue = "frame-ancestors 'self' https://farcaster.xyz https://*.farcaster.xyz https://*.warpcast.com https://warpcast.com https://client.warpcast.com https://miniapps.farcaster.xyz;";

  // Check if this is a Mini App request
  const isMiniAppRequest = pathname.startsWith('/mini') || searchParams.get('miniApp') === 'true';
  
  // Apply CSP for root and mini routes (Mini App compatible)
  if (pathname === '/' || pathname.startsWith('/mini') || isMiniAppRequest) {
    response.headers.set('Content-Security-Policy', cspValue);
    response.headers.delete('X-Frame-Options'); // Remove conflicting header
    
    // Add Mini App specific headers
    response.headers.set('X-Mini-App-Compatible', 'true');
    
    console.log(`[MIDDLEWARE DEBUG] Set Mini App CSP for ${pathname}: ${cspValue}`);
    
    // Log Mini App context
    if (isMiniAppRequest) {
      console.log(`[MIDDLEWARE DEBUG] Mini App request detected: ${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    }
    
    // Force log to ensure it appears
    if (typeof window === 'undefined') {
      console.error(`[MIDDLEWARE FORCE LOG] MINI APP CSP SET: ${cspValue}`);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match root and mini routes specifically
    '/',
    '/mini/:path*',
    // Also match all other paths to debug
    '/((?!_next|api|favicon.ico).*)',
  ],
};