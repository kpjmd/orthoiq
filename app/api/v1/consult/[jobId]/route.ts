import { NextRequest, NextResponse } from 'next/server';
import { fetchConsultationStatus, transformNormalModeResponse } from '@/lib/claude';
import {
  getContentJob,
  finalizeContentJob,
  updateConsultationResponse,
  storeConsultation,
} from '@/lib/database';
import { extractBodyPart } from '@/lib/bodyPart';
import { extractRecoveryDays } from '@/lib/recoveryDays';
import { buildEnrichments } from '@/lib/specialists';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CONTENT_PIPELINE_FID = 'content-pipeline';

function timeoutMs(): number {
  const raw = process.env.ORTHOIQ_CONTENT_JOB_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60 * 1000;
}

function toIso(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const apiKey = req.headers.get('x-api-key');
  if (!process.env.ORTHOIQ_CONTENT_API_KEY || apiKey !== process.env.ORTHOIQ_CONTENT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  let job;
  try {
    job = await getContentJob(jobId);
  } catch (err) {
    console.error(`[v1/consult/${jobId}] getContentJob failed:`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ jobId, status: 'not_found' }, { status: 404 });
  }

  const createdAt = toIso(job.created_at);
  const completedAt = toIso(job.completed_at);

  // Terminal states — return cached payload, do NOT hit Railway.
  if (job.status === 'completed') {
    if (job.result_payload) {
      return NextResponse.json(job.result_payload);
    }
    return NextResponse.json({
      jobId,
      status: 'completed',
      question: job.question,
      createdAt,
      completedAt,
    });
  }

  if (job.status === 'failed') {
    return NextResponse.json({
      jobId,
      status: 'failed',
      question: job.question,
      createdAt,
      completedAt,
      error: job.error_message || 'Consultation failed',
    });
  }

  if (job.status === 'timeout') {
    return NextResponse.json({
      jobId,
      status: 'timeout',
      question: job.question,
      createdAt,
      completedAt,
      error: 'Consultation timed out',
    });
  }

  // status === 'pending'
  if (!job.consultation_id) {
    // POST hasn't yet attached a consultation_id (race or partial failure)
    return NextResponse.json({ jobId, status: 'pending', createdAt });
  }

  const consultationId = job.consultation_id;

  let railwayData: any;
  try {
    railwayData = await fetchConsultationStatus(consultationId);
  } catch (err: any) {
    console.error(`[v1/consult/${jobId}] fetchConsultationStatus threw:`, err);
    return NextResponse.json({ jobId, status: 'pending', createdAt, note: 'Status check failed; will retry' });
  }

  // Railway → not_found: job is lost
  if (railwayData?.status === 'not_found') {
    try {
      await finalizeContentJob({
        jobId,
        status: 'failed',
        errorMessage: 'Railway reported consultation not_found',
      });
    } catch (e) {
      console.error(`[v1/consult/${jobId}] finalize not_found write failed:`, e);
    }
    return NextResponse.json(
      { jobId, status: 'failed', error: 'Consultation not_found on Railway', createdAt },
      { status: 404 }
    );
  }

  // Railway → error
  if (railwayData?.status === 'error') {
    const errorMessage = railwayData.error || 'Railway returned error status';
    try {
      await updateConsultationResponse({
        consultationId,
        status: 'failed',
        errorMessage,
      });
    } catch (e) {
      console.error(`[v1/consult/${jobId}] mark consultation failed:`, e);
    }
    try {
      await finalizeContentJob({ jobId, status: 'failed', errorMessage });
    } catch (e) {
      console.error(`[v1/consult/${jobId}] finalize failed write failed:`, e);
    }
    return NextResponse.json(
      { jobId, status: 'failed', error: errorMessage, createdAt },
      { status: 500 }
    );
  }

  // Railway → still processing → check timeout window
  if (railwayData?.status !== 'completed') {
    const createdMs = job.created_at ? new Date(job.created_at).getTime() : Date.now();
    if (Date.now() - createdMs > timeoutMs()) {
      try {
        await updateConsultationResponse({
          consultationId,
          status: 'timeout',
          errorMessage: 'Consultation timed out',
        });
      } catch (e) {
        console.error(`[v1/consult/${jobId}] mark consultation timeout:`, e);
      }
      try {
        await finalizeContentJob({
          jobId,
          status: 'timeout',
          errorMessage: 'Consultation timed out',
        });
      } catch (e) {
        console.error(`[v1/consult/${jobId}] finalize timeout write failed:`, e);
      }
      return NextResponse.json({
        jobId,
        status: 'timeout',
        question: job.question,
        createdAt,
        error: 'Consultation timed out',
      });
    }
    return NextResponse.json({ jobId, status: 'pending', createdAt });
  }

  // Railway → completed
  const claudeResponse = transformNormalModeResponse(railwayData, undefined, job.question);
  const specialists = claudeResponse.participatingSpecialists || [];
  const enrichments = buildEnrichments(claudeResponse.rawConsultationData);

  // Body part + recovery days enrichment (best-effort; never fail the response).
  let extractedBodyPart: string | null = null;
  try {
    extractedBodyPart = await extractBodyPart({
      question: job.question,
      keyFindings: Array.isArray((claudeResponse.rawConsultationData as any)?.keyFindings)
        ? ((claudeResponse.rawConsultationData as any).keyFindings as any[])
            .map((f: any) => (typeof f === 'string' ? f : f?.finding || ''))
            .filter(Boolean)
        : [],
    });
  } catch (e) {
    console.error(`[v1/consult/${jobId}] extractBodyPart failed:`, e);
  }

  let estimatedRecoveryDays: number | null = null;
  try {
    estimatedRecoveryDays = await extractRecoveryDays({
      question: job.question,
      bodyPart: extractedBodyPart,
    });
  } catch (e) {
    console.error(`[v1/consult/${jobId}] extractRecoveryDays failed:`, e);
  }

  // Persist to consultations table (idempotent — mirrors the existing status route).
  try {
    const { updated, exists } = await updateConsultationResponse({
      consultationId,
      status: 'completed',
      responseText: claudeResponse.response || '',
      rawConsultationData: claudeResponse.rawConsultationData,
      researchData: railwayData.research || null,
      participatingSpecialists: specialists,
      specialistCount: specialists.length,
      executionTime: railwayData.responseTime || 0,
      bodyPart: extractedBodyPart,
      predictedRecoveryDays: estimatedRecoveryDays,
    });

    if (!exists && claudeResponse.response) {
      try {
        await storeConsultation({
          consultationId,
          questionId: null,
          fid: CONTENT_PIPELINE_FID,
          mode: 'normal',
          participatingSpecialists: specialists,
          specialistCount: specialists.length,
          executionTime: railwayData.responseTime || 0,
          status: 'completed',
          questionText: job.question,
          responseText: claudeResponse.response,
          rawConsultationData: claudeResponse.rawConsultationData,
          researchData: railwayData.research || null,
          bodyPart: extractedBodyPart,
          predictedRecoveryDays: estimatedRecoveryDays,
        });
        console.log(`[v1/consult/${jobId}] Fallback insert created consultations row`);
      } catch (e) {
        console.error(`[v1/consult/${jobId}] Fallback insert failed:`, e);
      }
    }

    console.log(`[v1/consult/${jobId}] Persisted consultation ${consultationId} (updated=${updated})`);
  } catch (e) {
    console.error(`[v1/consult/${jobId}] Persist consultation failed:`, e);
  }

  // Shape per-specialist payload for content pipeline consumption.
  const specialistPayload = enrichments.map(e => {
    const raw = (claudeResponse.rawConsultationData as any)?.responses?.find(
      (r: any) => (r.response?.specialistType || r.specialistType) === e.metadata.agentType
    );
    const recommendations = raw?.response?.recommendations || raw?.recommendations || [];
    return {
      name: e.title,
      type: e.metadata.specialist,
      response: e.content,
      confidence: e.metadata.confidence,
      recommendations,
    };
  });

  const synthesized = (claudeResponse.rawConsultationData as any)?.synthesizedRecommendations || null;

  const completedIso = new Date().toISOString();
  const payload = {
    jobId,
    status: 'completed' as const,
    question: job.question,
    createdAt,
    completedAt: completedIso,
    consultation: {
      response: claudeResponse.response || '',
      inquiry: claudeResponse.inquiry,
      keyPoints: claudeResponse.keyPoints || [],
      urgencyLevel: claudeResponse.urgencyLevel,
      dataCompleteness: claudeResponse.dataCompleteness,
      triageConfidence: claudeResponse.triageConfidence,
      suggestedFollowUp: claudeResponse.suggestedFollowUp || [],
      specialists: specialistPayload,
      treatmentPlan: synthesized,
      researchData: railwayData.research || null,
    },
    meta: {
      bodyPart: extractedBodyPart,
      predictedRecoveryDays: estimatedRecoveryDays,
      participatingSpecialists: specialists,
      executionTime: railwayData.responseTime || 0,
      consultationId,
    },
  };

  try {
    await finalizeContentJob({ jobId, status: 'completed', resultPayload: payload });
  } catch (e) {
    console.error(`[v1/consult/${jobId}] finalize completed write failed:`, e);
  }

  return NextResponse.json(payload);
}
