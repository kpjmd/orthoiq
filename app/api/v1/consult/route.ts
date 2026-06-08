import { NextRequest, NextResponse } from 'next/server';
import { getOrthoResponse } from '@/lib/claude';
import {
  createContentJob,
  setContentJobConsultationId,
  finalizeContentJob,
  storeConsultation,
  initDatabase,
} from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CONTENT_PIPELINE_FID = 'content-pipeline';

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!process.env.ORTHOIQ_CONTENT_API_KEY || apiKey !== process.env.ORTHOIQ_CONTENT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined;
  const jobId = crypto.randomUUID();
  const requestId = `content-${jobId.slice(0, 8)}`;
  const createdAt = new Date().toISOString();

  try {
    await initDatabase();
  } catch (err) {
    console.error(`[v1/consult] initDatabase failed:`, err);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  try {
    await createContentJob({ jobId, question, metadata });
  } catch (err) {
    console.error(`[v1/consult] Failed to create content_jobs row:`, err);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }

  let claudeResponse;
  try {
    claudeResponse = await getOrthoResponse(question, requestId, {
      mode: 'normal',
      userId: CONTENT_PIPELINE_FID,
      queryType: 'clinical',
    });
  } catch (err: any) {
    console.error(`[v1/consult] getOrthoResponse threw:`, err);
    await finalizeContentJob({
      jobId,
      status: 'failed',
      errorMessage: err?.message || 'Failed to initiate consultation',
    }).catch(e => console.error(`[v1/consult] finalize-failed write failed:`, e));
    return NextResponse.json(
      { jobId, status: 'failed', createdAt, error: 'Failed to initiate consultation' },
      { status: 502 }
    );
  }

  // Happy path: Railway acked async with a consultationId.
  if (claudeResponse?.processingAsync && claudeResponse.consultationId) {
    const consultationId = claudeResponse.consultationId;

    try {
      await setContentJobConsultationId(jobId, consultationId);
    } catch (err) {
      console.error(`[v1/consult] Failed to set consultation_id on job ${jobId}:`, err);
      // Don't fail the request — GET's safety net will repair.
    }

    try {
      await storeConsultation({
        consultationId,
        questionId: null,
        fid: CONTENT_PIPELINE_FID,
        mode: 'normal',
        participatingSpecialists: [],
        specialistCount: 0,
        queryType: 'clinical',
        querySubtype: null,
        status: 'pending',
        questionText: question,
      });
    } catch (err) {
      console.error(`[v1/consult] Pre-insert consultations row failed for ${consultationId}:`, err);
      // Non-fatal — the GET path will fall back to storeConsultation on completion
    }

    return NextResponse.json({ jobId, status: 'pending', createdAt });
  }

  // Fallback path: Railway returned a synchronous result (or Claude fallback fired).
  // No multi-specialist payload to assemble — store whatever we have and mark completed.
  const completedAt = new Date().toISOString();
  const fallbackPayload = {
    jobId,
    status: 'completed' as const,
    question,
    createdAt,
    completedAt,
    consultation: {
      response: claudeResponse?.response || '',
      inquiry: claudeResponse?.inquiry,
      keyPoints: claudeResponse?.keyPoints || [],
      urgencyLevel: claudeResponse?.urgencyLevel,
      dataCompleteness: claudeResponse?.dataCompleteness,
      triageConfidence: claudeResponse?.triageConfidence,
      suggestedFollowUp: claudeResponse?.suggestedFollowUp || [],
      specialists: [],
      treatmentPlan: null,
      divergences: [],
      researchData: claudeResponse?.researchData || null,
    },
    meta: {
      bodyPart: null,
      predictedRecoveryDays: null,
      participatingSpecialists: claudeResponse?.participatingSpecialists || [],
      executionTime: null,
      fromAgentsSystem: claudeResponse?.fromAgentsSystem ?? false,
      degraded: true,
      researchStatus: claudeResponse?.researchData ? 'complete' : null,
    },
  };

  try {
    await finalizeContentJob({ jobId, status: 'completed', resultPayload: fallbackPayload });
  } catch (err) {
    console.error(`[v1/consult] finalize synchronous job failed:`, err);
  }

  return NextResponse.json(fallbackPayload);
}
