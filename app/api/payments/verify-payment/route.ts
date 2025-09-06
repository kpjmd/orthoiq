import { NextRequest, NextResponse } from 'next/server';
import { updatePaymentStatus } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, status, paymentHash, walletAddress } = body;

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: 'Payment ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid payment status' },
        { status: 400 }
      );
    }

    // Update payment status
    await updatePaymentStatus(paymentId, status, paymentHash, walletAddress);

    let message = `Payment status updated to ${status}`;
    if (status === 'completed') {
      message += '. Prescription has been added to MD review queue.';
    }

    return NextResponse.json({
      success: true,
      paymentId,
      status,
      message
    }, { status: 200 });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}