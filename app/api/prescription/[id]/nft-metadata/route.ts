import { NextRequest, NextResponse } from 'next/server';
import { getPrescription } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Prescription ID is required' },
        { status: 400 }
      );
    }

    const prescription = await getPrescription(id);

    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    // Return the stored NFT metadata
    return NextResponse.json(prescription.nftMetadata, { status: 200 });

  } catch (error) {
    console.error('Error getting prescription NFT metadata:', error);
    return NextResponse.json(
      { error: 'Failed to get NFT metadata' },
      { status: 500 }
    );
  }
}