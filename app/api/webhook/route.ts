import { NextRequest, NextResponse } from 'next/server';
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
  ParseWebhookEvent,
} from '@farcaster/miniapp-node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Parse and verify the webhook event
    const data = await parseWebhookEvent(body, verifyAppKeyWithNeynar);

    console.log('Farcaster webhook received:', {
      timestamp: new Date().toISOString(),
      event: (data as any).event,
      fid: (data as any).fid
    });

    // Handle different webhook events
    switch ((data as any).event) {
      case 'miniapp_added':
        await handleMiniappAdded(data);
        break;
      case 'miniapp_removed':
        await handleMiniappRemoved(data);
        break;
      case 'notifications_enabled':
        await handleNotificationsEnabled(data);
        break;
      case 'notifications_disabled':
        await handleNotificationsDisabled(data);
        break;
      default:
        console.log('Unknown webhook event type:', (data as any).event);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;

    // Handle specific webhook verification errors
    switch (error.name) {
      case 'VerifyJsonFarcasterSignature.InvalidDataError':
      case 'VerifyJsonFarcasterSignature.InvalidEventDataError':
        console.error('Invalid webhook data:', error);
        return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
      case 'VerifyJsonFarcasterSignature.InvalidAppKeyError':
        console.error('Invalid app key:', error);
        return NextResponse.json({ error: 'Invalid app key' }, { status: 401 });
      case 'VerifyJsonFarcasterSignature.VerifyAppKeyError':
        console.error('Error verifying app key:', error);
        return NextResponse.json({ error: 'Verification error' }, { status: 500 });
      default:
        console.error('Webhook processing error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to process webhook' },
          { status: 500 }
        );
    }
  }
}

async function handleMiniappAdded(data: any) {
  const { fid } = data as any;
  const fidString = typeof fid === 'number' ? fid.toString() : fid;

  // Per Farcaster privacy spec: miniapp_added does NOT enable notifications.
  // User must explicitly opt-in, which triggers notifications_enabled webhook.
  // We only log here - no token storage.
  console.log(`[Webhook] Mini app added for FID ${fidString} - awaiting explicit notification opt-in`);
}

async function handleMiniappRemoved(data: any) {
  const { fid } = data as any;
  const fidString = typeof fid === 'number' ? fid.toString() : fid;

  // Remove all notification tokens for this user
  await sql`
    DELETE FROM notification_tokens
    WHERE fid = ${fidString}
  `;

  console.log(`[Webhook] Mini app removed for FID ${fidString} - tokens deleted`);
}

async function handleNotificationsEnabled(data: any) {
  const { fid, notificationDetails } = data as any;
  const fidString = typeof fid === 'number' ? fid.toString() : fid;

  console.log(`[Webhook] Processing notifications_enabled for FID ${fidString}`, {
    hasToken: !!notificationDetails?.token,
    hasUrl: !!notificationDetails?.url,
    timestamp: new Date().toISOString()
  });

  if (!notificationDetails?.token || !notificationDetails?.url) {
    console.error(`[Webhook] Missing required notification details for FID ${fidString}`);
    return;
  }

  await saveNotificationToken(fidString, notificationDetails.token, notificationDetails.url);

  console.log(`[Webhook] Notifications enabled for FID ${fidString}`);
}

async function handleNotificationsDisabled(data: any) {
  const { fid } = data as any;
  const fidString = typeof fid === 'number' ? fid.toString() : fid;

  // Mark all tokens as disabled for this user
  await sql`
    UPDATE notification_tokens
    SET enabled = false
    WHERE fid = ${fidString}
  `;

  console.log(`[Webhook] Notifications disabled for FID ${fidString}`);
}

async function saveNotificationToken(fid: string, token: string, url: string) {
  const startTime = Date.now();

  // FID is already converted to string by caller
  const fidString = fid;

  // First, disable any existing tokens for this user
  await sql`
    UPDATE notification_tokens
    SET enabled = false
    WHERE fid = ${fidString}
  `;

  // Insert the new token
  await sql`
    INSERT INTO notification_tokens (fid, token, url, enabled, created_at, updated_at)
    VALUES (${fidString}, ${token}, ${url}, true, NOW(), NOW())
    ON CONFLICT (fid, token)
    DO UPDATE SET
      url = ${url},
      enabled = true,
      updated_at = NOW()
  `;

  const processingTime = Date.now() - startTime;
  console.log(`[Webhook] Token saved for FID ${fidString} in ${processingTime}ms`);

  if (processingTime > 1000) {
    console.warn(`[Webhook] Slow processing: ${processingTime}ms for FID ${fidString}`);
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'ok',
    service: 'OrthoIQ Farcaster Webhook',
    timestamp: new Date().toISOString()
  });
}