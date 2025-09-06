import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const body = await request.json();
    
    console.log('Farcaster webhook received:', {
      timestamp: new Date().toISOString(),
      payload: body
    });

    // Basic webhook acknowledgment
    // In a production app, you might want to:
    // - Verify the webhook signature
    // - Process user interactions
    // - Store interaction data
    // - Trigger notifications

    return NextResponse.json({ 
      success: true,
      message: 'Webhook received successfully' 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process webhook' 
      },
      { status: 500 }
    );
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