import { NextRequest, NextResponse } from 'next/server';
import { checkPrescriptionPaymentStatus } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prescriptionId = searchParams.get('prescriptionId');

    if (!prescriptionId) {
      return NextResponse.json(
        { error: 'Prescription ID is required' },
        { status: 400 }
      );
    }

    const status = await checkPrescriptionPaymentStatus(prescriptionId);

    return NextResponse.json(status, { status: 200 });

  } catch (error) {
    console.error('Error checking prescription payment status:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}