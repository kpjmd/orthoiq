import { NextRequest, NextResponse } from 'next/server';
import { getUserResearchQuota } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    const quota = await getUserResearchQuota(fid);
    
    if (!quota) {
      // Return default free tier limits for users without subscription
      return NextResponse.json({
        hasSubscription: false,
        tier: 'free',
        limits: {
          bronze: { quota: 0, used: 0, remaining: 0 },
          silver: { quota: 0, used: 0, remaining: 0 },
          gold: { quota: 0, used: 0, remaining: 0 }
        },
        resetDate: new Date(),
        message: 'No active research subscription. Upgrade to access research features.'
      });
    }

    const response = {
      hasSubscription: true,
      tier: quota.tier,
      limits: {
        bronze: {
          quota: quota.bronzeQuota,
          used: quota.bronzeUsed,
          remaining: Math.max(0, quota.bronzeQuota - quota.bronzeUsed)
        },
        silver: {
          quota: quota.silverQuota,
          used: quota.silverUsed,
          remaining: Math.max(0, quota.silverQuota - quota.silverUsed)
        },
        gold: {
          quota: quota.goldQuota,
          used: quota.goldUsed,
          remaining: Math.max(0, quota.goldQuota - quota.goldUsed)
        }
      },
      resetDate: quota.resetDate,
      totalRemaining: Math.max(0, 
        (quota.bronzeQuota - quota.bronzeUsed) +
        (quota.silverQuota - quota.silverUsed) + 
        (quota.goldQuota - quota.goldUsed)
      )
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Research quota check error:', error);
    return NextResponse.json(
      { error: 'Failed to check research quota' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, tier = 'scholar' } = body;

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    if (!['scholar', 'practitioner', 'institution'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be scholar, practitioner, or institution' },
        { status: 400 }
      );
    }

    // Set quotas based on tier
    const tierQuotas = {
      scholar: { bronze: 5, silver: 2, gold: 0 },
      practitioner: { bronze: 10, silver: 3, gold: 1 },
      institution: { bronze: 25, silver: 10, gold: 3 }
    };

    const quotas = tierQuotas[tier as keyof typeof tierQuotas];

    // In a real implementation, this would create a subscription record
    // For now, we'll simulate subscription creation
    
    const response = {
      success: true,
      message: `${tier} subscription activated`,
      tier,
      quotas,
      activatedAt: new Date()
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Research subscription creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create research subscription' },
      { status: 500 }
    );
  }
}