import { NextRequest, NextResponse } from 'next/server';
import { fetchConsultationStatus, transformNormalModeResponse } from '@/lib/claude';
import { updateConsultationResponse, updateQuestionResponse, storeConsultation } from '@/lib/database';
import { extractBodyPart } from '@/lib/bodyPart';
import { extractRecoveryDays } from '@/lib/recoveryDays';
import { buildEnrichments, getSpecialistDisplayName, getSpecialtyDescription } from '@/lib/specialists';
import { normalizeLiveDivergences } from '@/lib/divergence';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  const { consultationId } = await params;

  try {
    const data = await fetchConsultationStatus(consultationId);

    if (data.status === 'processing') {
      return NextResponse.json({ status: 'processing', consultationId });
    }

    if (data.status === 'not_found') {
      return NextResponse.json({ status: 'not_found', consultationId }, { status: 404 });
    }

    if (data.status === 'error') {
      try {
        await updateConsultationResponse({
          consultationId,
          status: 'failed',
          errorMessage: data.error || 'Railway returned error status',
        });
      } catch (persistErr) {
        console.error(`[status/${consultationId}] Failed to mark consultation as failed:`, persistErr);
      }
      return NextResponse.json(
        { status: 'error', error: data.error, consultationId },
        { status: 500 }
      );
    }

    // status === 'completed' — transform Railway response into the same shape as /api/claude POST
    const claudeResponse = transformNormalModeResponse(data);
    const specialists = claudeResponse.participatingSpecialists || [];
    const agentEnrichments = buildEnrichments(claudeResponse.rawConsultationData);

    // Inter-agent divergences — backend always emits this array on the live result.
    // Normalize the nested live shape into the canonical DivergenceRecord shape so
    // the client renders it with the same component the admin views use.
    const divergences = normalizeLiveDivergences(
      claudeResponse.rawConsultationData?.synthesizedRecommendations?.coordinationMetadata?.divergences,
      claudeResponse.consultationId || consultationId
    );

    const agentBadges = specialists.map((s: string) => ({
      name: getSpecialistDisplayName(s),
      type: s,
      active: true,
      specialty: getSpecialtyDescription(s),
    }));

    const specialistConsultation = claudeResponse.consultationId
      ? {
          consultationId: claudeResponse.consultationId,
          participatingSpecialists: specialists,
          coordinationSummary: `Multi-specialist consultation with ${specialists.length} specialists`,
          specialistCount: specialists.length,
        }
      : null;

    // Persist the completed comprehensive response
    let persistedQuestionId: number | null = null;
    try {
      const { updated, exists, questionId, questionText } = await updateConsultationResponse({
        consultationId,
        status: 'completed',
        responseText: claudeResponse.response || '',
        rawConsultationData: claudeResponse.rawConsultationData,
        researchData: data.research || null,
        participatingSpecialists: specialists,
        specialistCount: specialists.length,
        executionTime: data.responseTime || 0,
      });
      persistedQuestionId = questionId;

      // Run body part + recovery days enrichment using the stored question text
      if (updated && questionText) {
        let extractedBodyPart: string | null = null;
        try {
          extractedBodyPart = await extractBodyPart({
            question: questionText,
            keyFindings: Array.isArray(claudeResponse.rawConsultationData?.keyFindings)
              ? claudeResponse.rawConsultationData.keyFindings
                  .map((f: any) => (typeof f === 'string' ? f : f?.finding || ''))
                  .filter(Boolean)
              : [],
          });
        } catch (bpErr) {
          console.error(`[status/${consultationId}] Body part extraction failed:`, bpErr);
        }

        let estimatedRecoveryDays: number | null = null;
        try {
          estimatedRecoveryDays = await extractRecoveryDays({
            question: questionText,
            bodyPart: extractedBodyPart,
          });
        } catch (rdErr) {
          console.error(`[status/${consultationId}] Recovery days extraction failed:`, rdErr);
        }

        // Write enrichments back to the row
        if (extractedBodyPart || estimatedRecoveryDays) {
          try {
            await updateConsultationResponse({
              consultationId,
              status: 'completed',
              bodyPart: extractedBodyPart,
              predictedRecoveryDays: estimatedRecoveryDays,
            });
          } catch (enrichErr) {
            console.error(`[status/${consultationId}] Failed to write enrichments:`, enrichErr);
          }
        }
      }

      // Update the placeholder question row with the real response text
      if (updated && questionId && claudeResponse.response) {
        try {
          await updateQuestionResponse(questionId, claudeResponse.response, claudeResponse.confidence || 0);
        } catch (qUpdateErr) {
          console.error(`[status/${consultationId}] Failed to update question response:`, qUpdateErr);
        }
      }

      // Fallback: pre-insert never ran (DB was down at POST time) — create the row now
      if (!exists && claudeResponse.response) {
        try {
          await storeConsultation({
            consultationId,
            questionId: null,
            fid: 'unknown',
            mode: 'normal',
            participatingSpecialists: specialists,
            specialistCount: specialists.length,
            executionTime: data.responseTime || 0,
            status: 'completed',
            responseText: claudeResponse.response,
            rawConsultationData: claudeResponse.rawConsultationData,
            researchData: data.research || null,
          });
          console.log(`[status/${consultationId}] Fallback insert: created row with unknown identity`);
        } catch (fallbackErr) {
          console.error(`[status/${consultationId}] Fallback insert failed:`, fallbackErr);
        }
      }

      console.log(`[status/${consultationId}] Persisted comprehensive response (updated=${updated}, questionId=${questionId})`);
    } catch (persistErr) {
      console.error(`[status/${consultationId}] Failed to persist consultation:`, persistErr);
      // Don't fail the response — user still needs to see their consult
    }

    return NextResponse.json({
      status: 'completed',
      response: claudeResponse.response || '',
      confidence: claudeResponse.confidence,
      isFiltered: false,
      isApproved: false,
      isPendingReview: true,
      reviewedBy: undefined,
      inquiry: claudeResponse.inquiry,
      keyPoints: claudeResponse.keyPoints,
      urgencyLevel: claudeResponse.urgencyLevel,
      questionId: persistedQuestionId,
      enrichments: agentEnrichments,
      agentCost: 0,
      hasResearch: agentEnrichments.some((e: any) => e.type === 'research' || e.type === 'consultation'),
      userTier: 'basic',
      specialistConsultation,
      agentBadges,
      hasSpecialistConsultation: specialistConsultation !== null,
      consultationId: claudeResponse.consultationId || consultationId,
      fromAgentsSystem: true,
      dataCompleteness: claudeResponse.dataCompleteness,
      suggestedFollowUp: claudeResponse.suggestedFollowUp || [],
      triageConfidence: claudeResponse.triageConfidence,
      specialistCoverage: undefined,
      participatingSpecialists: specialists,
      researchData: data.research || null,
      rawConsultationData: claudeResponse.rawConsultationData,
      divergences,
      queryType: 'clinical' as const,
      querySubtype: null,
      agentNetwork: {
        activeAgents: specialists.length,
        totalCapacity: 5,
        currentLoad: specialists.length,
        networkUtilization: specialists.length / 5,
      },
      agentRouting: {
        selectedAgent: 'orthoiq-consultation',
        routingReason: 'multi_specialist_consultation',
        alternativeAgents: [],
        networkExecuted: true,
      },
      agentPerformance: {
        executionTime: data.responseTime || 0,
        successRate: 1.0,
        averageExecutionTime: data.responseTime || 0,
        totalExecutions: 1,
        specialistCount: specialists.length,
      },
      coordinationMetadata: {
        networkId: 'consultation',
        messageQueueDepth: 0,
        taskId: consultationId,
        executionMode: 'consultation_coordinated',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 500 }
    );
  }
}
