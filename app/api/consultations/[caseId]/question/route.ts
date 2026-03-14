import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const sql = getSql();
  const result = await sql`
    SELECT q.question FROM questions q
    JOIN consultations c ON c.question_id = q.id
    WHERE c.consultation_id = ${caseId}
    LIMIT 1
  `;
  return NextResponse.json({ question: result[0]?.question || null });
}
