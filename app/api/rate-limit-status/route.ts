import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json(
        { error: 'FID parameter is required' },
        { status: 400 }
      );
    }

    // Check current rate limit status
    const rateLimitResult = await checkRateLimitDB(fid);
    
    // Calculate remaining questions for different tiers
    const getUserTier = (fid: string) => {
      // For now, everyone is authenticated if they have an FID
      // This would be enhanced with actual auth logic
      return 'authenticated';
    };

    const tier = getUserTier(fid);
    const dailyLimit = tier === 'anonymous' ? 1 : tier === 'authenticated' ? 3 : 10;
    const used = rateLimitResult.count || 0;
    const remaining = Math.max(0, dailyLimit - used);

    return NextResponse.json({
      tier,
      dailyLimit,
      used,
      remaining,
      resetTime: rateLimitResult.resetTime,
      allowed: rateLimitResult.allowed
    });

  } catch (error) {
    console.error('Rate limit status error:', error);
    return NextResponse.json(
      { error: 'Failed to check rate limit status' },
      { status: 500 }
    );
  }
}