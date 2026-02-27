'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ResearchState, AgentEnrichment, AgentSummaryData, StructuredBriefData } from '@/lib/types';
import { specialistIcons } from './SpecialistBadge';
import ConfidenceIndicator, { getConfidenceLevel } from './ConfidenceIndicator';
import AgentSummaryRow from './AgentSummaryRow';
import ResearchStatusRow from './ResearchStatusRow';

interface StructuredBriefProps {
  rawConsultationData: any;
  researchState?: ResearchState;
  onExpandSpecialist: (index: number) => void;
  onViewResearch?: () => void;
  enrichments?: AgentEnrichment[];
}

// Format agent summary text — handles null values and snake_case from backend
function formatAgentSummary(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return 'Analysis complete';
  // Replace null literal
  let text = raw.replace(/\bnull\b/g, 'N/A');
  // Convert snake_case tokens to Title Case (e.g. valgus_collapse → Valgus Collapse)
  text = text.replace(/\b([A-Za-z]+(?:_[A-Za-z]+)+)\b/g, (match) =>
    match.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
  // Trim excess whitespace
  text = text.trim();
  if (!text || text === 'N/A' || text.includes('N/A%')) return 'Analysis complete';
  // Truncate if very long
  return text.length > 120 ? text.slice(0, 117) + '...' : text;
}

// Map specialist type keys to display names
const specialistDisplayNames: { [key: string]: string } = {
  triage: 'Triage',
  painWhisperer: 'Pain Mgmt',
  movementDetective: 'Movement',
  strengthSage: 'Strength',
  mindMender: 'Psychology',
};

export default function StructuredBrief({
  rawConsultationData,
  researchState,
  onExpandSpecialist,
  onViewResearch,
  enrichments,
}: StructuredBriefProps) {
  const briefData = useMemo((): StructuredBriefData | null => {
    if (!rawConsultationData) return null;

    const synthRec = rawConsultationData.synthesizedRecommendations;
    const responses = rawConsultationData.responses || [];

    // Key Finding
    const keyFinding =
      synthRec?.prescriptionData?.diagnosisHypothesis?.primary ||
      (synthRec?.synthesis ? synthRec.synthesis.split('.')[0] + '.' : 'Assessment pending');

    // Immediate Action
    const immediateAction =
      synthRec?.treatmentPlan?.phase1?.interventions?.[0]?.intervention ||
      'See specialist recommendations below';

    // Consensus: count agents with full agreement with triage
    let consensusCount = 0;
    const totalAgents = responses.length;
    for (const r of responses) {
      if (r.response?.agreementWithTriage === 'full' || r.response?.agreementWithTriage === 'self') {
        consensusCount++;
      }
    }

    // Overall Confidence
    const overallConfidence = synthRec?.confidenceFactors?.overallConfidence || 0;

    // Agent summaries
    const agentSummaries = responses.map((r: any) => {
      const specType = r.response?.specialistType || r.response?.specialist || '';
      const displayName = specialistDisplayNames[specType] || r.response?.specialist || specType;
      const icon = specialistIcons[specType] || '👨‍⚕️';
      const rawFinding = r.response?.keyFindings?.[0]?.finding || r.response?.assessment?.primaryFindings?.[0];
      const finding = formatAgentSummary(rawFinding);
      const conf = r.response?.confidence || 0;
      return {
        specialist: displayName,
        specialistType: specType,
        icon,
        summary: finding,
        confidence: conf,
        confidenceLevel: getConfidenceLevel(conf),
        agreementWithTriage: r.response?.agreementWithTriage || 'unknown',
      };
    });

    // Per-agent confidences
    const perAgentConfidences = responses.map((r: any) => ({
      specialist: r.response?.specialist || r.response?.specialistType || '',
      confidence: r.response?.confidence || 0,
    }));

    // Follow-up
    const followUpQuestion = synthRec?.suggestedFollowUp?.[0]?.question || null;

    return {
      keyFinding,
      immediateAction,
      consensusCount,
      totalAgents,
      overallConfidence,
      overallConfidenceLevel: getConfidenceLevel(overallConfidence),
      agentSummaries,
      followUpQuestion,
      perAgentConfidences,
    };
  }, [rawConsultationData]);

  if (!briefData) return null;

  const defaultResearchState: ResearchState = researchState || { status: 'idle', result: null, error: null };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Brief Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Structured Brief</h3>
        <ConfidenceIndicator score={briefData.overallConfidence} variant="badge" />
      </div>

      {/* Key Finding + Immediate Action */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
        <div className="space-y-3">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Key Finding</span>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{briefData.keyFinding}</p>
          </div>
          <div className="border-t border-blue-100 pt-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">Immediate Action</span>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{briefData.immediateAction}</p>
          </div>
        </div>
      </div>

      {/* Consensus Row */}
      <div className="flex items-center justify-between text-sm px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500">Agents Consulted:</span>
          <div className="flex -space-x-1">
            {briefData.agentSummaries.map((agent: AgentSummaryData, i: number) => (
              <span
                key={i}
                title={agent.specialist}
                className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs shadow-sm"
              >
                {agent.icon}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Consensus:</span>
          <span className={`text-xs font-bold ${
            briefData.consensusCount === briefData.totalAgents ? 'text-green-700' :
            briefData.consensusCount >= briefData.totalAgents * 0.6 ? 'text-yellow-700' :
            'text-red-700'
          }`}>
            {briefData.consensusCount}/{briefData.totalAgents}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Agent Summary Rows */}
      <div>
        {briefData.agentSummaries.map((agent, index) => (
          <AgentSummaryRow
            key={agent.specialistType || index}
            specialist={agent.specialist}
            specialistType={agent.specialistType}
            summary={agent.summary}
            confidence={agent.confidence}
            index={index}
            onViewFull={onExpandSpecialist}
          />
        ))}

        {/* Research Status Row */}
        <ResearchStatusRow researchState={defaultResearchState} onViewFull={onViewResearch} />
      </div>

      {/* Follow-up */}
      {briefData.followUpQuestion && (
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
          <span className="text-xs font-semibold text-purple-600 uppercase">Suggested Follow-up</span>
          <p className="text-sm text-purple-900 mt-0.5">{briefData.followUpQuestion}</p>
        </div>
      )}
    </motion.div>
  );
}
