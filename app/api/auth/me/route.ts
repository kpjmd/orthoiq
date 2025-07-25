import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@farcaster/quick-auth';

const client = createClient();

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('Authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const token = authorization.split(' ')[1];
    
    try {
      // Verify the JWT token
      const payload = await client.verifyJwt({
        token,
        domain: process.env.NEXT_PUBLIC_DOMAIN || 'orthoiq.vercel.app',
      });

      // The payload.sub contains the FID
      // In a real app, you would fetch additional user data from your database
      // or from Farcaster APIs using the FID
      
      // For now, return basic user info
      return NextResponse.json({
        fid: payload.sub,
        username: `user_${payload.sub}`,
        displayName: `User ${payload.sub}`,
        pfpUrl: undefined,
        verifications: [],
        followerCount: undefined
      });

    } catch (error) {
      console.error('Invalid token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}