import { NextRequest, NextResponse } from 'next/server';
import { fetchConsultationStatus, transformNormalModeResponse, getOrthoResponse } from '@/lib/claude';
import { fetchResearchStatus, triggerResearchAgents } from '@/lib/agentsClient';
import {
  getContentJob,
  finalizeContentJob,
  markContentJobConsultationComplete,
  updateConsultationResponse,
  patchConsultationResearchData,
  storeConsultation,
  setContentJobConsultationId,
} from '@/lib/database';
import { extractBodyPart } from '@/lib/bodyPart';
import { extractRecoveryDays } from '@/lib/recoveryDays';
import { buildEnrichments } from '@/lib/specialists';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CONTENT_PIPELINE_FID = 'content-pipeline';
const SELF_HEAL_GRACE_MS = 15_000;

function timeoutMs(): number {
  const raw = process.env.ORTHOIQ_CONTENT_JOB_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60 * 1000;
}

function researchTimeoutMs(): number {
  const raw = process.env.ORTHOIQ_RESEARCH_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
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

function buildResearchCaseData(question: string, rawConsultationData: any): any {
  const cd = rawConsultationData?.caseData;
  if (cd) {
    return {
      primaryComplaint: cd.primaryComplaint || question,
      symptoms: cd.symptoms,
      duration: cd.duration,
      location: cd.location,
      painLevel: cd.painLevel,
      age: cd.age,
      rawQuery: cd.rawQuery || question,
    };
  }
  return { primaryComplaint: question, rawQuery: question };
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

  // status === 'pending', research_status === 'pending':
  // Main panel is done and staged; we only need to land research.
  if (job.research_status === 'pending') {
    return finishResearchPhase(jobId, job, createdAt);
  }

  // status === 'pending', research_status === null:
  // Original flow — wait for the main panel to finish.
  if (!job.consultation_id) {
    const ageMs = job.created_at ? Date.now() - new Date(job.created_at).getTime() : 0;

    if (ageMs < SELF_HEAL_GRACE_MS) {
      return NextResponse.json({ jobId, status: 'pending', createdAt });
    }

    console.warn(`[v1/consult/${jobId}] consultation_id missing after ${ageMs}ms — self-heal submit`);

    let recoveryResponse;
    try {
      recoveryResponse = await getOrthoResponse(job.question, `recover-${jobId.slice(0, 8)}`, {
        mode: 'normal',
        userId: CONTENT_PIPELINE_FID,
        queryType: 'clinical',
      });
    } catch (err: any) {
      console.error(`[v1/consult/${jobId}] self-heal getOrthoResponse threw:`, err);
      return NextResponse.json({ jobId, status: 'pending', createdAt, note: 'Self-heal retry deferred' });
    }

    if (!recoveryResponse?.processingAsync || !recoveryResponse.consultationId) {
      const completedAtIso = new Date().toISOString();
      const payload = {
        jobId,
        status: 'completed' as const,
        question: job.question,
        createdAt,
        completedAt: completedAtIso,
        consultation: {
          response: recoveryResponse?.response || '',
          inquiry: recoveryResponse?.inquiry,
          keyPoints: recoveryResponse?.keyPoints || [],
          urgencyLevel: recoveryResponse?.urgencyLevel,
          specialists: [],
          treatmentPlan: null,
          researchData: recoveryResponse?.researchData || null,
        },
        meta: {
          bodyPart: null,
          predictedRecoveryDays: null,
          participatingSpecialists: recoveryResponse?.participatingSpecialists || [],
          executionTime: null,
          fromAgentsSystem: recoveryResponse?.fromAgentsSystem ?? false,
          degraded: true,
          researchStatus: recoveryResponse?.researchData ? 'complete' : null,
        },
      };
      await finalizeContentJob({
        jobId,
        status: 'completed',
        resultPayload: payload,
        researchStatus: recoveryResponse?.researchData ? 'complete' : undefined,
      }).catch(e =>
        console.error(`[v1/consult/${jobId}] self-heal finalize failed:`, e)
      );
      return NextResponse.json(payload);
    }

    job.consultation_id = recoveryResponse.consultationId;
    try {
      await setContentJobConsultationId(jobId, recoveryResponse.consultationId);
    } catch (err) {
      console.error(`[v1/consult/${jobId}] self-heal setContentJobConsultationId failed:`, err);
    }
    try {
      await storeConsultation({
        consultationId: recoveryResponse.consultationId,
        questionId: null,
        fid: CONTENT_PIPELINE_FID,
        mode: 'normal',
        participatingSpecialists: [],
        specialistCount: 0,
        queryType: 'clinical',
        querySubtype: null,
        status: 'pending',
        questionText: job.question,
      });
    } catch (err) {
      console.error(`[v1/consult/${jobId}] self-heal pre-insert failed:`, err);
    }

    return NextResponse.json({ jobId, status: 'pending', createdAt, note: 'Self-heal submitted to agents' });
  }

  const consultationId = job.consultation_id;

  let railwayData: any;
  try {
    railwayData = await fetchConsultationStatus(consultationId);
  } catch (err: any) {
    console.error(`[v1/consult/${jobId}] fetchConsultationStatus threw:`, err);
    return NextResponse.json({ jobId, status: 'pending', createdAt, note: 'Status check failed; will retry' });
  }

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

  // Railway → completed. Assemble the consultation payload.
  const claudeResponse = transformNormalModeResponse(railwayData, undefined, job.question);
  const specialists = claudeResponse.participatingSpecialists || [];
  const enrichments = buildEnrichments(claudeResponse.rawConsultationData);

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

  const inlineResearch = railwayData.research || null;

  try {
    const { updated, exists } = await updateConsultationResponse({
      consultationId,
      status: 'completed',
      responseText: claudeResponse.response || '',
      rawConsultationData: claudeResponse.rawConsultationData,
      researchData: inlineResearch,
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
          researchData: inlineResearch,
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

  const buildPayload = (researchStatus: 'complete' | 'pending', researchData: any) => {
    const completedIso = researchStatus === 'complete' ? new Date().toISOString() : null;
    return {
      jobId,
      status: researchStatus === 'complete' ? ('completed' as const) : ('pending' as const),
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
        researchData,
      },
      meta: {
        bodyPart: extractedBodyPart,
        predictedRecoveryDays: estimatedRecoveryDays,
        participatingSpecialists: specialists,
        executionTime: railwayData.responseTime || 0,
        consultationId,
        researchStatus,
      },
    };
  };

  // Inline research present — finalize immediately.
  if (inlineResearch) {
    const payload = buildPayload('complete', inlineResearch);
    try {
      await finalizeContentJob({
        jobId,
        status: 'completed',
        resultPayload: payload,
        researchStatus: 'complete',
      });
    } catch (e) {
      console.error(`[v1/consult/${jobId}] finalize completed write failed:`, e);
    }
    return NextResponse.json(payload);
  }

  // Research is missing — trigger it, stage the partial payload, return pending.
  const stagedPayload = buildPayload('pending', null);
  const note = 'Consultation complete, awaiting research';

  const triggerResult = await triggerResearchAgents({
    consultationId,
    caseData: buildResearchCaseData(job.question, claudeResponse.rawConsultationData),
    consultationResult: claudeResponse.rawConsultationData,
  });
  if (!triggerResult.ok) {
    console.warn(
      `[v1/consult/${jobId}] triggerResearchAgents returned not-ok (status=${triggerResult.status}): ${triggerResult.error || 'unknown'} — polling anyway`
    );
  }

  try {
    await markContentJobConsultationComplete({
      jobId,
      researchStatus: 'pending',
      resultPayload: stagedPayload,
    });
  } catch (e) {
    console.error(`[v1/consult/${jobId}] markContentJobConsultationComplete failed:`, e);
  }

  return NextResponse.json({ jobId, status: 'pending', createdAt, note });
}

/**
 * Research-only polling branch. The consultation payload is already staged in
 * job.result_payload; we just need to merge research into it (or finalize as
 * timeout / failed if it doesn't land).
 */
async function finishResearchPhase(
  jobId: string,
  job: any,
  createdAt: string | null
): Promise<NextResponse> {
  const staged = job.result_payload || {};
  const consultationId = job.consultation_id as string;

  const createdMs = job.created_at ? new Date(job.created_at).getTime() : Date.now();
  const consultationCompletedMs = job.consultation_completed_at
    ? new Date(job.consultation_completed_at).getTime()
    : createdMs;

  const overallExceeded = Date.now() - createdMs > timeoutMs();
  const researchExceeded = Date.now() - consultationCompletedMs > researchTimeoutMs();

  // Try to fetch research status.
  let researchResp;
  try {
    researchResp = await fetchResearchStatus(consultationId);
  } catch (err: any) {
    console.error(`[v1/consult/${jobId}] fetchResearchStatus threw:`, err);
    if (overallExceeded || researchExceeded) {
      return finalizeWithoutResearch(jobId, staged, createdAt, 'timeout');
    }
    return NextResponse.json({
      jobId,
      status: 'pending',
      createdAt,
      note: 'Research status check failed; will retry',
    });
  }

  if (researchResp.status === 'complete' && researchResp.research) {
    const payload = mergeResearchIntoPayload(staged, researchResp.research, 'complete');
    try {
      await patchConsultationResearchData(consultationId, researchResp.research);
    } catch (e) {
      console.error(`[v1/consult/${jobId}] patchConsultationResearchData failed:`, e);
    }
    try {
      await finalizeContentJob({
        jobId,
        status: 'completed',
        resultPayload: payload,
        researchStatus: 'complete',
      });
    } catch (e) {
      console.error(`[v1/consult/${jobId}] finalize research-complete write failed:`, e);
    }
    return NextResponse.json(payload);
  }

  if (researchResp.status === 'failed') {
    return finalizeWithoutResearch(jobId, staged, createdAt, 'failed');
  }

  // pending / not_found
  if (overallExceeded || researchExceeded) {
    return finalizeWithoutResearch(jobId, staged, createdAt, 'timeout');
  }

  return NextResponse.json({
    jobId,
    status: 'pending',
    createdAt,
    note: 'Awaiting research',
  });
}

function mergeResearchIntoPayload(staged: any, researchData: any, researchStatus: 'complete'): any {
  return {
    ...staged,
    status: 'completed',
    completedAt: new Date().toISOString(),
    consultation: {
      ...(staged.consultation || {}),
      researchData,
    },
    meta: {
      ...(staged.meta || {}),
      researchStatus,
    },
  };
}

async function finalizeWithoutResearch(
  jobId: string,
  staged: any,
  createdAt: string | null,
  researchStatus: 'failed' | 'timeout'
): Promise<NextResponse> {
  const payload = {
    ...staged,
    status: 'completed',
    completedAt: new Date().toISOString(),
    consultation: {
      ...(staged.consultation || {}),
      researchData: null,
    },
    meta: {
      ...(staged.meta || {}),
      researchStatus,
    },
  };
  try {
    await finalizeContentJob({
      jobId,
      status: 'completed',
      resultPayload: payload,
      researchStatus,
    });
  } catch (e) {
    console.error(`[v1/consult/${jobId}] finalize research-${researchStatus} write failed:`, e);
  }
  // createdAt is preserved in the staged payload; reference is unused here.
  void createdAt;
  return NextResponse.json(payload);
}
