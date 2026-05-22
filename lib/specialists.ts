/**
 * Shared helpers for shaping multi-specialist consultation responses.
 * Used by /api/claude/status/[consultationId] and /api/v1/consult/[jobId].
 */

export interface SpecialistEnrichment {
  type: 'consultation';
  title: string;
  content: string;
  metadata: {
    specialist: string;
    agentType: string;
    confidence: number;
    responseTime?: number;
    agreementWithTriage?: number;
  };
}

export function getSpecialistDisplayName(specialist: string): string {
  const names: Record<string, string> = {
    triage: 'OrthoTriage Master',
    painWhisperer: 'Pain Whisperer',
    movementDetective: 'Movement Detective',
    strengthSage: 'Strength Sage',
    mindMender: 'Mind Mender',
  };
  return names[specialist] || specialist;
}

export function getSpecialtyDescription(specialist: string): string {
  const descriptions: Record<string, string> = {
    triage: 'Triage and Case Coordination',
    painWhisperer: 'Pain Management and Assessment',
    movementDetective: 'Biomechanics and Movement Analysis',
    strengthSage: 'Functional Restoration and Rehabilitation',
    mindMender: 'Psychological Aspects of Recovery',
  };
  return descriptions[specialist] || 'Medical Specialist';
}

export function buildEnrichments(rawConsultationData: any): SpecialistEnrichment[] {
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
