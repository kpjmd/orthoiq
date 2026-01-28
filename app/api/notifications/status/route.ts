import { NextRequest, NextResponse } from 'next/server';
import { checkNotificationPermissions } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const fid = request.nextUrl.searchParams.get('fid');

    if (!fid) {
      return NextResponse.json(
        { error: 'FID required' },
        { status: 400 }
      );
    }

    const enabled = await checkNotificationPermissions(fid);

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Failed to check notification status:', error);
    return NextResponse.json(
      { error: 'Failed to check notification status' },
      { status: 500 }
    );
  }
}
