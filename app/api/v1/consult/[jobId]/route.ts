import { NextRequest, NextResponse } from 'next/server';
import { fetchConsultationStatus, transformNormalModeResponse, getOrthoResponse } from '@/lib/claude';
import { fetchResearchStatus } from '@/lib/agentsClient';
import {
  getContentJob,
  finalizeContentJob,
  updateConsultationResponse,
  patchConsultationResearchData,
  storeConsultation,
  setContentJobConsultationId,
} from '@/lib/database';
import {
  assembleConsultationPayload,
  isResearchStub,
  withPopulatedEquipoiseCards,
} from '@/lib/consultAssembly';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CONTENT_PIPELINE_FID = 'content-pipeline';
const SELF_HEAL_GRACE_MS = 15_000;

function timeoutMs(): number {
  const raw = process.env.AEQUOS_CONTENT_JOB_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60 * 1000;
}

function researchTimeoutMs(): number {
  const raw = process.env.AEQUOS_RESEARCH_TIMEOUT_MS;
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const apiKey = req.headers.get('x-api-key');
  if (!process.env.AEQUOS_CONTENT_API_KEY || apiKey !== process.env.AEQUOS_CONTENT_API_KEY) {
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
      // If a research-kickoff stub was mistakenly stored as researchData (Railway
      // embeds a pending stub in the consultation response before research finishes),
      // attempt one live fetch to recover the real research result.
      const rd = job.result_payload?.consultation?.researchData;
      if (isResearchStub(rd) && job.consultation_id) {
        try {
          const researchResp = await fetchResearchStatus(job.consultation_id);
          if (researchResp.status === 'complete' && researchResp.research) {
            const healed = mergeResearchIntoPayload(job.result_payload, researchResp.research, 'complete');
            await finalizeContentJob({ jobId, status: 'completed', resultPayload: healed, researchStatus: 'complete' });
            await patchConsultationResearchData(job.consultation_id, researchResp.research)
              .catch(e => console.error(`[v1/consult/${jobId}] stub-heal patch failed:`, e));
            return NextResponse.json(healed);
          }
        } catch (e) {
          console.error(`[v1/consult/${jobId}] stub-heal research fetch failed:`, e);
        }
      }
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
          divergences: [],
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

  // Railway → completed. Assemble the consultation payload via the shared helper
  // (same assembly used by the POST synchronous-consultation path).
  const claudeResponse = transformNormalModeResponse(railwayData, undefined, job.question);
  const result = await assembleConsultationPayload({
    claudeResponse,
    jobId,
    question: job.question,
    createdAt,
    consultationId,
    responseTime: railwayData.responseTime || 0,
  });

  if (result.kind === 'completed') {
    return NextResponse.json(result.payload);
  }
  return NextResponse.json({ jobId, status: 'pending', createdAt, note: result.note });
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
    const payload = await withPopulatedEquipoiseCards(
      mergeResearchIntoPayload(staged, researchResp.research, 'complete'),
      consultationId
    );
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
