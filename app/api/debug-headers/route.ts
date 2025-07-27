import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.json({
    message: 'Debug endpoint for header verification',
    timestamp: new Date().toISOString(),
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
  });

  // Set the same CSP we want on main routes (including root domain)
  const cspValue = "frame-ancestors 'self' https://farcaster.xyz https://*.farcaster.xyz https://*.warpcast.com https://warpcast.com https://client.warpcast.com;";
  
  response.headers.set('Content-Security-Policy', cspValue);
  response.headers.set('X-Debug-CSP', cspValue);
  response.headers.delete('X-Frame-Options');
  
  // Add CORS for testing
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Expose-Headers', 'Content-Security-Policy, X-Debug-CSP');

  console.log(`[DEBUG API] Set CSP header: ${cspValue}`);
  
  return response;
}

export async function HEAD(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  
  // Set the same CSP we want on main routes (including root domain)
  const cspValue = "frame-ancestors 'self' https://farcaster.xyz https://*.farcaster.xyz https://*.warpcast.com https://warpcast.com https://client.warpcast.com;";
  
  response.headers.set('Content-Security-Policy', cspValue);
  response.headers.set('X-Debug-CSP', cspValue);
  response.headers.delete('X-Frame-Options');
  
  // Add CORS for testing
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Expose-Headers', 'Content-Security-Policy, X-Debug-CSP');

  console.log(`[DEBUG API HEAD] Set CSP header: ${cspValue}`);
  
  return response;
}