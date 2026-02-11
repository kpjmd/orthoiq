import { NextRequest, NextResponse } from 'next/server';
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
  ParseWebhookEvent,
} from '@farcaster/miniapp-node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

function generateRequestId() {
  return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  let data: any;

  // Step 1: Parse and verify the webhook event
  try {
    const body = await request.text();
    data = await parseWebhookEvent(body, verifyAppKeyWithNeynar);
  } catch (e: unknown) {
    const elapsed = Date.now() - startTime;
    const error = e as ParseWebhookEvent.ErrorType;

    // Log verification failures distinctly
    console.error(`[Webhook:${requestId}] Verification failed in ${elapsed}ms:`, {
      errorName: error.name,
      errorMessage: error.message,
    });

    switch (error.name) {
      case 'VerifyJsonFarcasterSignature.InvalidDataError':
      case 'VerifyJsonFarcasterSignature.InvalidEventDataError':
        return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
      case 'VerifyJsonFarcasterSignature.InvalidAppKeyError':
        return NextResponse.json({ error: 'Invalid app key' }, { status: 401 });
      case 'VerifyJsonFarcasterSignature.VerifyAppKeyError':
        return NextResponse.json({ error: 'Verification error' }, { status: 500 });
      default:
        return NextResponse.json(
          { success: false, error: 'Failed to process webhook' },
          { status: 500 }
        );
    }
  }

  // Step 2: Handle the verified event
  try {
    console.log(`[Webhook:${requestId}] Received event:`, {
      event: data.event,
      fid: data.fid,
      timestamp: new Date().toISOString(),
    });

    switch (data.event) {
      case 'miniapp_added':
        await handleMiniappAdded(requestId, data);
        break;
      case 'miniapp_removed':
        await handleMiniappRemoved(requestId, data);
        break;
      case 'notifications_enabled':
        await handleNotificationsEnabled(requestId, data);
        break;
      case 'notifications_disabled':
        await handleNotificationsDisabled(requestId, data);
        break;
      default:
        console.log(`[Webhook:${requestId}] Unknown event type: ${data.event}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Webhook:${requestId}] Completed in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Webhook:${requestId}] Handler error after ${elapsed}ms:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleMiniappAdded(requestId: string, data: any) {
  const { fid } = data;
  const fidString = typeof fid === 'number' ? fid.toString() : fid;

  console.log(`[Webhook:${requestId}] Mini app added for FID ${fidString} - awaiting explicit notification opt-in`);
}

async function handleMiniappRemoved(requestId: string, data: any) {
  const { fid } = data;
  const fidString = typeof fid === 'number' ? fid.toString() : fid;

  await sql`
    DELETE FROM notification_tokens
    WHERE fid = ${fidString}
  `;

  console.log(`[Webhook:${requestId}] Mini app removed for FID ${fidString} - tokens deleted`);
}

async function handleNotificationsEnabled(requestId: string, data: any) {
  const { fid, notificationDetails } = data;
  const fidString = typeof fid === 'number' ? fid.toString() : fid;

  console.log(`[Webhook:${requestId}] Processing notifications_enabled for FID ${fidString}`, {
    hasToken: !!notificationDetails?.token,
    hasUrl: !!notificationDetails?.url,
  });

  if (!notificationDetails?.token || !notificationDetails?.url) {
    console.error(`[Webhook:${requestId}] Missing notification details for FID ${fidString}`);
    return;
  }

  try {
    await saveNotificationToken(requestId, fidString, notificationDetails.token, notificationDetails.url);
    console.log(`[Webhook:${requestId}] Notifications enabled for FID ${fidString}`);
  } catch (dbError) {
    console.error(`[Webhook:${requestId}] DB error saving token for FID ${fidString}:`, dbError);
    throw dbError;
  }
}

async function handleNotificationsDisabled(requestId: string, data: any) {
  const { fid } = data;
  const fidString = typeof fid === 'number' ? fid.toString() : fid;

  try {
    await sql`
      UPDATE notification_tokens
      SET enabled = false
      WHERE fid = ${fidString}
    `;
    console.log(`[Webhook:${requestId}] Notifications disabled for FID ${fidString}`);
  } catch (dbError) {
    console.error(`[Webhook:${requestId}] DB error disabling notifications for FID ${fidString}:`, dbError);
    throw dbError;
  }
}

async function saveNotificationToken(requestId: string, fid: string, token: string, url: string) {
  const startTime = Date.now();

  // Disable any existing tokens for this user
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
  console.log(`[Webhook:${requestId}] Token saved for FID ${fid} in ${processingTime}ms`);

  if (processingTime > 1000) {
    console.warn(`[Webhook:${requestId}] Slow DB write: ${processingTime}ms for FID ${fid}`);
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'OrthoIQ Farcaster Webhook',
    timestamp: new Date().toISOString()
  });
}
