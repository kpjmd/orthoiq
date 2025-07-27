import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  const pathname = request.nextUrl.pathname;
  
  // Define the frame-ancestors directive for Farcaster domains
  const farcasterFrameAncestors = [
    "'self'",
    "https://*.farcaster.xyz",
    "https://*.warpcast.com", 
    "https://warpcast.com",
    "https://client.warpcast.com",
    "https://dev.warpcast.com",
    "https://staging.warpcast.com"
  ].join(' ');

  // Apply frame-friendly headers for mini app routes and root
  if (pathname.startsWith('/mini') || pathname === '/') {
    // Set CSP headers that allow framing from Farcaster domains
    response.headers.set(
      'Content-Security-Policy',
      `frame-ancestors ${farcasterFrameAncestors};`
    );
    
    // Remove X-Frame-Options if present (conflicts with CSP frame-ancestors)
    response.headers.delete('X-Frame-Options');
    
    // Add other security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    console.log(`[Middleware] Applied frame-friendly CSP for ${pathname}: frame-ancestors ${farcasterFrameAncestors};`);
  }
  // For all other routes, apply strict security
  else if (!pathname.startsWith('/api/farcaster-manifest') && !pathname.startsWith('/api/webhooks')) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    console.log(`[Middleware] Applied strict security headers for ${pathname}`);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};