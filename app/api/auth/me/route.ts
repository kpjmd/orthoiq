import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@farcaster/quick-auth';

const client = createClient();

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('Authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.error('Auth error: Missing or invalid authorization header');
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const token = authorization.split(' ')[1];
    console.log('Auth: Processing token for verification');
    
    try {
      // Get domain from environment - handle both local and production
      const domain = process.env.NEXT_PUBLIC_DOMAIN || 'orthoiq.vercel.app';
      console.log(`Auth: Verifying token for domain: ${domain}`);
      
      // Verify the JWT token
      const payload = await client.verifyJwt({
        token,
        domain,
      });

      const fid = parseInt(String(payload.sub));
      console.log(`Auth: Token verified successfully for FID: ${fid}`);

      // Enhanced user data for specific users (you can add more)
      let userData = {
        fid,
        username: undefined as string | undefined,
        displayName: undefined as string | undefined,
        pfpUrl: undefined as string | undefined,
        verifications: [] as string[],
        followerCount: undefined as number | undefined
      };

      // Special handling for admin user (your FID)
      if (fid === 15230) {
        userData = {
          fid,
          username: 'kpjmd',
          displayName: 'Dr. KPJMD',
          pfpUrl: undefined,
          verifications: ['medical'],
          followerCount: undefined
        };
        console.log('Auth: Admin user detected, enhanced profile applied');
      } else {
        // For other users, use basic profile
        userData = {
          fid,
          username: `user_${fid}`,
          displayName: `User ${fid}`,
          pfpUrl: undefined,
          verifications: [],
          followerCount: undefined
        };
      }
      
      return NextResponse.json(userData);

    } catch (verificationError) {
      console.error('Token verification failed:', verificationError);
      
      // Try to extract FID from token payload without verification as fallback
      try {
        const [, payloadBase64] = token.split('.');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
        const fid = parseInt(String(payload.sub));
        
        if (fid && !isNaN(fid)) {
          console.log(`Auth: Using fallback FID extraction: ${fid}`);
          
          // Return basic user info for fallback
          return NextResponse.json({
            fid,
            username: fid === 15230 ? 'kpjmd' : `user_${fid}`,
            displayName: fid === 15230 ? 'Dr. KPJMD' : `User ${fid}`,
            pfpUrl: undefined,
            verifications: fid === 15230 ? ['medical'] : [],
            followerCount: undefined
          });
        }
      } catch (fallbackError) {
        console.error('Fallback FID extraction failed:', fallbackError);
      }
      
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Auth endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}