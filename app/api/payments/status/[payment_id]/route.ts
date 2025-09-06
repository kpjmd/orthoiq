import { NextRequest, NextResponse } from 'next/server';
import { getPaymentRequest } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payment_id: string }> }
) {
  try {
    const { payment_id: paymentId } = await params;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const paymentRequest = await getPaymentRequest(paymentId);

    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Return payment status with relevant details
    return NextResponse.json({
      paymentId: paymentRequest.payment_id,
      prescriptionId: paymentRequest.prescription_id,
      fid: paymentRequest.fid,
      amountUSDC: parseFloat(paymentRequest.amount_usdc),
      status: paymentRequest.status,
      paymentHash: paymentRequest.payment_hash,
      walletAddress: paymentRequest.wallet_address,
      requestedAt: paymentRequest.requested_at,
      paidAt: paymentRequest.paid_at,
      refundedAt: paymentRequest.refunded_at,
      // Include prescription details
      prescriptionRarity: paymentRequest.rarity_type,
      question: paymentRequest.question,
      confidence: paymentRequest.confidence
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting payment status:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}