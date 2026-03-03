import { NextRequest, NextResponse } from 'next/server';
import { sendNotification, sendRateLimitResetNotification, checkNotificationPermissions, sendMilestoneNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const { fid, type, title, body, consultationId, milestoneDay } = await request.json();
    
    if (!fid) {
      return NextResponse.json(
        { error: 'FID is required' },
        { status: 400 }
      );
    }

    let success = false;
    let message = '';

    switch (type) {
      case 'custom':
        if (!title || !body) {
          return NextResponse.json(
            { error: 'Title and body are required for custom notifications' },
            { status: 400 }
          );
        }
        success = await sendNotification(fid, {
          title,
          body,
          targetUrl: '/miniapp'
        });
        message = `Custom notification sent to FID ${fid}`;
        break;

      case 'reset':
        success = await sendRateLimitResetNotification(fid, 'authenticated');
        message = `Reset notification sent to FID ${fid}`;
        break;

      case 'check_permissions':
        success = await checkNotificationPermissions(fid);
        message = `Notification permissions for FID ${fid}: ${success ? 'enabled' : 'disabled'}`;
        break;

      case 'milestone':
        if (!consultationId || !milestoneDay) {
          return NextResponse.json(
            { error: 'consultationId and milestoneDay are required for milestone notifications' },
            { status: 400 }
          );
        }
        success = await sendMilestoneNotification(fid, consultationId, Number(milestoneDay));
        message = `Milestone notification (day ${milestoneDay}) sent to FID ${fid}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type. Use: custom, reset, check_permissions, milestone' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success,
      message,
      fid,
      type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing notification:', error);
    return NextResponse.json(
      { error: 'Failed to test notification' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Notification test endpoint',
    usage: {
      method: 'POST',
      body: {
        fid: 'string (required)',
        type: 'custom | reset | check_permissions | milestone',
        title: 'string (required for custom)',
        body: 'string (required for custom)',
        consultationId: 'string (required for milestone)',
        milestoneDay: 'number (required for milestone, e.g. 14, 28, 56)'
      }
    },
    examples: [
      {
        description: 'Send custom notification',
        body: {
          fid: '12345',
          type: 'custom',
          title: 'Test Notification',
          body: 'This is a test notification from OrthoIQ!'
        }
      },
      {
        description: 'Send reset notification',
        body: {
          fid: '12345',
          type: 'reset'
        }
      },
      {
        description: 'Check notification permissions',
        body: {
          fid: '12345',
          type: 'check_permissions'
        }
      },
      {
        description: 'Send milestone notification (deep-link test)',
        body: {
          fid: '12345',
          type: 'milestone',
          consultationId: 'abc-123',
          milestoneDay: 14
        }
      }
    ]
  });
}