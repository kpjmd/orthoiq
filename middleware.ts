import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  console.log(`[MIDDLEWARE DEBUG] Processing: ${request.nextUrl.pathname}`);
  
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  
  // Enhanced CSP for Farcaster Mini Apps
  const cspValue = "frame-ancestors 'self' https://farcaster.xyz https://*.farcaster.xyz https://*.warpcast.com https://warpcast.com https://client.warpcast.com https://miniapps.farcaster.xyz;";

  // Check if this is a Mini App request or frames request
  const isMiniAppRequest = pathname.startsWith('/miniapp') || searchParams.get('miniApp') === 'true';
  const isFramesRequest = pathname.startsWith('/frames');

  // Apply CSP for root, miniapp, and frames routes (Farcaster compatible)
  if (pathname === '/' || pathname.startsWith('/miniapp') || pathname.startsWith('/frames') || isMiniAppRequest) {
    response.headers.set('Content-Security-Policy', cspValue);
    response.headers.delete('X-Frame-Options'); // Remove conflicting header
    
    // Add Mini App specific headers
    response.headers.set('X-Mini-App-Compatible', 'true');
    
    console.log(`[MIDDLEWARE DEBUG] Set Mini App CSP for ${pathname}: ${cspValue}`);
    
    // Log Mini App and Frames context
    if (isMiniAppRequest) {
      console.log(`[MIDDLEWARE DEBUG] Mini App request detected: ${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    }
    if (isFramesRequest) {
      console.log(`[MIDDLEWARE DEBUG] Frames request detected: ${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
    }
    
    // Force log to ensure it appears
    if (typeof window === 'undefined') {
      console.error(`[MIDDLEWARE FORCE LOG] MINI APP CSP SET: ${cspValue}`);
    }
  }

  // Add no-cache headers for HTML pages to prevent browser caching
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html') || pathname.endsWith('.html') || 
      (pathname !== '/api' && !pathname.startsWith('/api/') && !pathname.includes('.'))) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    console.log(`[MIDDLEWARE DEBUG] Set no-cache headers for HTML page: ${pathname}`);
  }

  return response;
}

export const config = {
  matcher: [
    // Match root and miniapp routes specifically
    '/',
    '/miniapp/:path*',
    // Also match all other paths to debug
    '/((?!_next|api|favicon.ico).*)',
  ],
};