import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitStatus, UserTier } from '@/lib/rateLimit';
import { getRateLimitStatusDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const tier = (searchParams.get('tier') || 'basic') as UserTier;

    if (!fid) {
      return NextResponse.json(
        { error: 'FID parameter is required' },
        { status: 400 }
      );
    }

    // Check current rate limit status with database-backed tier support
    const rateLimitResult = await getRateLimitStatusDB(fid, tier);
    
    const used = rateLimitResult.total ? rateLimitResult.total - rateLimitResult.remaining! : 0;

    return NextResponse.json({
      tier: rateLimitResult.tier,
      dailyLimit: rateLimitResult.total,
      used,
      remaining: rateLimitResult.remaining,
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