import { NextRequest, NextResponse } from 'next/server';
import { buildLandingPayload } from '@/lib/landing/buildLandingPayload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    const payload = await buildLandingPayload(caseId);
    if (!payload) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Landing payload error:', error);
    return NextResponse.json(
      { error: 'Failed to build landing payload' },
      { status: 500 }
    );
  }
}
