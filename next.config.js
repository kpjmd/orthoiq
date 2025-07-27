/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // appDir is no longer needed in Next.js 15
  },
  
  // Security headers
  async headers() {
    return [
      {
        // Mini App route - allow framing for Farcaster
        source: '/mini/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Primary CSP header - allow framing from Farcaster domains
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.farcaster.xyz https://*.warpcast.com https://warpcast.com https://client.warpcast.com;",
          },
        ],
      },
      {
        // Farcaster manifest and webhooks - allow access
        source: '/api/(farcaster-manifest|webhooks)/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        // Root route - allow framing for redirect to work
        source: '/',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Primary CSP header - allow framing from Farcaster domains
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.farcaster.xyz https://*.warpcast.com https://warpcast.com https://client.warpcast.com;",
          },
        ],
      },
      {
        // All other routes - strict security  
        source: '/((?!mini|api/farcaster-manifest|api/webhooks)(?!$).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(),',
          },
        ],
      },
      {
        // API routes - stricter headers but allow CORS for needed endpoints
        source: '/api/((?!farcaster-manifest|webhooks).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig