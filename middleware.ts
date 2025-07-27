import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  console.log(`[MIDDLEWARE DEBUG] Processing: ${request.nextUrl.pathname}`);
  
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  
  // Simplified CSP for Farcaster domains
  const cspValue = "frame-ancestors 'self' https://*.farcaster.xyz https://*.warpcast.com https://warpcast.com https://client.warpcast.com;";

  // Always apply CSP for root and mini routes
  if (pathname === '/' || pathname.startsWith('/mini')) {
    response.headers.set('Content-Security-Policy', cspValue);
    response.headers.delete('X-Frame-Options'); // Remove conflicting header
    
    console.log(`[MIDDLEWARE DEBUG] Set CSP for ${pathname}: ${cspValue}`);
    
    // Force log to ensure it appears
    if (typeof window === 'undefined') {
      console.error(`[MIDDLEWARE FORCE LOG] CSP SET: ${cspValue}`);
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