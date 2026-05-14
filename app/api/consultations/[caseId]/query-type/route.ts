import { NextRequest, NextResponse } from 'next/server';
import { getConsultation, updateConsultationQueryType } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { fid, queryType } = body;

    if (!fid) {
      return NextResponse.json({ error: 'FID is required' }, { status: 400 });
    }

    if (!['informational', 'clinical'].includes(queryType)) {
      return NextResponse.json(
        { error: 'queryType must be "informational" or "clinical"' },
        { status: 400 }
      );
    }

    const consultation = await getConsultation(caseId);
    if (!consultation) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (consultation.fid !== fid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await updateConsultationQueryType(caseId, queryType);
    return NextResponse.json({ success: true, caseId, queryType });

  } catch (error) {
    console.error('Error updating consultation query type:', error);
    return NextResponse.json({ error: 'Failed to update query type' }, { status: 500 });
  }
}
