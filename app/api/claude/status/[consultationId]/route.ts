import { NextRequest, NextResponse } from 'next/server';
import { fetchConsultationStatus, transformNormalModeResponse } from '@/lib/claude';

// Helper: build specialist enrichments from rawConsultationData (mirrors route.ts logic)
function buildEnrichments(rawConsultationData: any): any[] {
  if (!rawConsultationData?.responses) return [];
  return rawConsultationData.responses.map((resp: any) => {
    const specialist = resp.response || {};
    const specialistType = specialist.specialistType || resp.specialistType || 'specialist';
    const specialistName = specialist.specialist || resp.specialist || getSpecialistDisplayName(specialistType);

    let content: string = specialist.response || specialist.assessment || '';
    if (typeof content === 'object' && content !== null) {
      const obj = content as any;
      content = obj.text || obj.response || obj.assessment || JSON.stringify(content);
    }
    if (typeof content !== 'string') content = String(content);

    content = content
      .replace(/```json\s*\n/g, '')
      .replace(/```\s*$/g, '')
      .replace(/^```\s*/g, '');

    const recommendations = specialist.recommendations || resp.recommendations;
    if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
      content += '\n\n**Recommendations:**\n';
      recommendations.forEach((rec: any, idx: number) => {
        const intervention = rec.intervention || rec;
        const timeline = rec.timeline || '';
        content += `${idx + 1}. ${intervention}${timeline ? ` - ${timeline}` : ''}\n`;
      });
    }

    return {
      type: 'consultation' as const,
      title: specialistName,
      content,
      metadata: {
        specialist: specialistType,
        agentType: specialistType,
        confidence: specialist.confidence || resp.confidence || 0.85,
        responseTime: specialist.responseTime || resp.responseTime,
        agreementWithTriage: specialist.agreementWithTriage || resp.agreementWithTriage,
      },
    };
  });
}

function getSpecialistDisplayName(specialist: string): string {
  const names: Record<string, string> = {
    triage: 'OrthoTriage Master',
    painWhisperer: 'Pain Whisperer',
    movementDetective: 'Movement Detective',
    strengthSage: 'Strength Sage',
    mindMender: 'Mind Mender',
  };
  return names[specialist] || specialist;
}

function getSpecialtyDescription(specialist: string): string {
  const descriptions: Record<string, string> = {
    triage: 'Triage and Case Coordination',
    painWhisperer: 'Pain Management and Assessment',
    movementDetective: 'Biomechanics and Movement Analysis',
    strengthSage: 'Functional Restoration and Rehabilitation',
    mindMender: 'Psychological Aspects of Recovery',
  };
  return descriptions[specialist] || 'Medical Specialist';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { consultationId: string } }
) {
  const { consultationId } = params;

  try {
    const data = await fetchConsultationStatus(consultationId);

    if (data.status === 'processing') {
      return NextResponse.json({ status: 'processing', consultationId });
    }

    if (data.status === 'not_found') {
      return NextResponse.json({ status: 'not_found', consultationId }, { status: 404 });
    }

    if (data.status === 'error') {
      return NextResponse.json(
        { status: 'error', error: data.error, consultationId },
        { status: 500 }
      );
    }

    // status === 'completed' — transform Railway response into the same shape as /api/claude POST
    const claudeResponse = transformNormalModeResponse(data);
    const specialists = claudeResponse.participatingSpecialists || [];
    const agentEnrichments = buildEnrichments(claudeResponse.rawConsultationData);

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

    return NextResponse.json({
      response: claudeResponse.response || '',
      confidence: claudeResponse.confidence,
      isFiltered: false,
      isApproved: false,
      isPendingReview: true,
      reviewedBy: undefined,
      inquiry: claudeResponse.inquiry,
      keyPoints: claudeResponse.keyPoints,
      urgencyLevel: claudeResponse.urgencyLevel,
      questionId: null,
      enrichments: agentEnrichments,
      agentCost: 0,
      hasResearch: agentEnrichments.some(e => e.type === 'research' || e.type === 'consultation'),
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
