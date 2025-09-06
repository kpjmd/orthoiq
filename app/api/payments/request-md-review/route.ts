import { NextRequest, NextResponse } from 'next/server';
import { createPaymentRequest, getPrescription } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prescriptionId, fid, amountUSDC = 10.00 } = body;

    if (!prescriptionId || !fid) {
      return NextResponse.json(
        { error: 'Prescription ID and FID are required' },
        { status: 400 }
      );
    }

    // Get prescription details to get question ID
    const prescription = await getPrescription(prescriptionId);
    
    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    // Check if user owns this prescription
    if (prescription.fid !== fid) {
      return NextResponse.json(
        { error: 'You can only request MD review for your own prescriptions' },
        { status: 403 }
      );
    }

    // Check if already MD reviewed
    if (prescription.md_reviewed) {
      return NextResponse.json(
        { error: 'This prescription has already been reviewed by an MD' },
        { status: 400 }
      );
    }

    // Create payment request
    const paymentId = await createPaymentRequest(
      prescriptionId,
      prescription.question_id,
      fid,
      amountUSDC
    );

    return NextResponse.json({
      success: true,
      paymentId,
      amountUSDC,
      message: 'Payment request created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating MD review payment request:', error);
    return NextResponse.json(
      { error: 'Failed to create payment request' },
      { status: 500 }
    );
  }
}