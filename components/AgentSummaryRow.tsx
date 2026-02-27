'use client';

import { specialistIcons, specialistColors } from './SpecialistBadge';
import ConfidenceIndicator from './ConfidenceIndicator';

interface AgentSummaryRowProps {
  specialist: string;
  specialistType: string;
  summary: string;
  confidence: number;
  index: number;
  onViewFull: (index: number) => void;
}

export default function AgentSummaryRow({
  specialist,
  specialistType,
  summary,
  confidence,
  index,
  onViewFull,
}: AgentSummaryRowProps) {
  const icon = specialistIcons[specialistType] || '👨‍⚕️';
  const colors = specialistColors[specialistType] || specialistColors['triage'];

  const truncated = summary.length > 120 ? summary.slice(0, 120) + '...' : summary;

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-b-0">
      <div className={`flex-shrink-0 w-8 h-8 ${colors.icon} rounded-lg flex items-center justify-center`}>
        <span className="text-base">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-0.5">
          <span className={`text-sm font-semibold ${colors.text}`}>{specialist}</span>
          <ConfidenceIndicator score={confidence} variant="inline" />
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{truncated}</p>
      </div>
      <button
        onClick={() => onViewFull(index)}
        className="flex-shrink-0 text-xs text-medical-primary hover:text-medical-accent font-medium whitespace-nowrap transition-colors"
      >
        View Full &rsaquo;
      </button>
    </div>
  );
}
