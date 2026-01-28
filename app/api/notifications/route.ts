import { NextRequest, NextResponse } from 'next/server';
import { sendResponseReviewNotification, sendRateLimitResetNotification, requestNotificationPermissions, disableNotificationPermissions } from '@/lib/notifications';
import { UserTier } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'response_review':
        const success = await sendResponseReviewNotification(data);
        return NextResponse.json({ success });

      case 'rate_limit_reset':
        const { fid, tier } = data;
        const resetSuccess = await sendRateLimitResetNotification(fid, tier as UserTier);
        return NextResponse.json({ success: resetSuccess });

      case 'request_permissions':
        const { fid: permissionFid } = data;
        const permissionSuccess = await requestNotificationPermissions(permissionFid);
        return NextResponse.json({ success: permissionSuccess });

      case 'disable_permissions':
        const { fid: disableFid } = data;
        const disableSuccess = await disableNotificationPermissions(disableFid);
        return NextResponse.json({ success: disableSuccess });

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { error: 'Failed to process notification request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OrthoIQ Notifications API',
    supportedTypes: ['response_review', 'rate_limit_reset', 'request_permissions', 'disable_permissions']
  });
}