import { NextRequest, NextResponse } from 'next/server';
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
  ParseWebhookEvent,
} from '@farcaster/miniapp-node';
import { neon } from '@neondatabase/serverless';

// Add CORS headers for webhook requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Parse and verify the webhook event
    const data = await parseWebhookEvent(body, verifyAppKeyWithNeynar);
    
    console.log('Received Farcaster webhook event:', data.event);
    
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
        console.log('Unknown event type:', data.event);
    }
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;
    
    switch (error.name) {
      case 'VerifyJsonFarcasterSignature.InvalidDataError':
      case 'VerifyJsonFarcasterSignature.InvalidEventDataError':
        console.error('Invalid request data:', error);
        return NextResponse.json({ error: 'Invalid request data' }, { status: 400, headers: corsHeaders });
      case 'VerifyJsonFarcasterSignature.InvalidAppKeyError':
        console.error('Invalid app key:', error);
        return NextResponse.json({ error: 'Invalid app key' }, { status: 401, headers: corsHeaders });
      case 'VerifyJsonFarcasterSignature.VerifyAppKeyError':
        console.error('Error verifying app key:', error);
        return NextResponse.json({ error: 'Verification error' }, { status: 500, headers: corsHeaders });
      default:
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function handleMiniappAdded(data: any) {
  const { fid, notificationDetails } = data as any;
  
  if (notificationDetails) {
    await saveNotificationToken(fid, notificationDetails.token, notificationDetails.url);
  }
  
  console.log(`Mini app added for FID ${fid}`);
}

async function handleMiniappRemoved(data: any) {
  const { fid } = data as any;
  
  // Remove all notification tokens for this user
  await sql`
    DELETE FROM notification_tokens 
    WHERE fid = ${fid}
  `;
  
  console.log(`Mini app removed for FID ${fid}`);
}

async function handleNotificationsEnabled(data: any) {
  const { fid, notificationDetails } = data as any;
  
  await saveNotificationToken(fid, notificationDetails.token, notificationDetails.url);
  
  console.log(`Notifications enabled for FID ${fid}`);
}

async function handleNotificationsDisabled(data: any) {
  const { fid } = data as any;
  
  // Mark all tokens as disabled for this user
  await sql`
    UPDATE notification_tokens 
    SET enabled = false 
    WHERE fid = ${fid}
  `;
  
  console.log(`Notifications disabled for FID ${fid}`);
}

async function saveNotificationToken(fid: number, token: string, url: string) {
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
}