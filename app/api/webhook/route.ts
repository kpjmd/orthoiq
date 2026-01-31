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
  const { fid, notificationDetails } = data as any;

  if (notificationDetails) {
    await saveNotificationToken(fid, notificationDetails.token, notificationDetails.url);
    console.log(`[Webhook] Mini app added for FID ${fid} - notification token saved`);
  } else {
    console.log(`[Webhook] Mini app added for FID ${fid} - no notification details`);
  }
}

async function handleMiniappRemoved(data: any) {
  const { fid } = data as any;

  // Remove all notification tokens for this user
  await sql`
    DELETE FROM notification_tokens
    WHERE fid = ${fid}
  `;

  console.log(`[Webhook] Mini app removed for FID ${fid} - tokens deleted`);
}

async function handleNotificationsEnabled(data: any) {
  const { fid, notificationDetails } = data as any;

  await saveNotificationToken(fid, notificationDetails.token, notificationDetails.url);

  console.log(`[Webhook] Notifications enabled for FID ${fid}`);
}

async function handleNotificationsDisabled(data: any) {
  const { fid } = data as any;

  // Mark all tokens as disabled for this user
  await sql`
    UPDATE notification_tokens
    SET enabled = false
    WHERE fid = ${fid}
  `;

  console.log(`[Webhook] Notifications disabled for FID ${fid}`);
}

async function saveNotificationToken(fid: number, token: string, url: string) {
  const startTime = Date.now();

  // First, disable any existing tokens for this user
  await sql`
    UPDATE notification_tokens
    SET enabled = false
    WHERE fid = ${fid}
  `;

  // Insert the new token
  await sql`
    INSERT INTO notification_tokens (fid, token, url, enabled, created_at, updated_at)
    VALUES (${fid}, ${token}, ${url}, true, NOW(), NOW())
    ON CONFLICT (fid, token)
    DO UPDATE SET
      url = ${url},
      enabled = true,
      updated_at = NOW()
  `;

  const processingTime = Date.now() - startTime;
  console.log(`[Webhook] Token saved for FID ${fid} in ${processingTime}ms`);

  if (processingTime > 1000) {
    console.warn(`[Webhook] Slow processing: ${processingTime}ms for FID ${fid}`);
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