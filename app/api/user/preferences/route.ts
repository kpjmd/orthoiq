import { NextRequest, NextResponse } from 'next/server';
import { getUserPreferences, updateUserPreferences } from '@/lib/database';

/**
 * GET /api/user/preferences
 * Get user preferences by FID
 */
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

    const preferences = await getUserPreferences(fid);

    if (!preferences) {
      // Return default preferences for new users
      return NextResponse.json({
        fid,
        preferred_mode: 'fast',
        preferred_platform: 'miniapp',
        consultation_count: 0,
        last_consultation_id: null,
        is_new_user: true
      });
    }

    return NextResponse.json({
      ...preferences,
      is_new_user: false
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get user preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/preferences
 * Update user preferences
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, preferred_mode, preferred_platform, last_consultation_id } = body;

    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    // Validate mode if provided
    if (preferred_mode && !['fast', 'normal'].includes(preferred_mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "fast" or "normal"' },
        { status: 400 }
      );
    }

    // Validate platform if provided
    if (preferred_platform && !['miniapp', 'web'].includes(preferred_platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be "miniapp" or "web"' },
        { status: 400 }
      );
    }

    await updateUserPreferences(fid, {
      preferred_mode,
      preferred_platform,
      last_consultation_id
    });

    const updatedPreferences = await getUserPreferences(fid);

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}
