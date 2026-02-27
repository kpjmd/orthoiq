'use client';

import { ConfidenceLevel } from '@/lib/types';

interface ConfidenceIndicatorProps {
  score: number; // 0-1
  variant: 'badge' | 'inline' | 'full';
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

const levelConfig = {
  high: { label: 'High', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-300', bar: 'bg-green-500', dot: 'bg-green-500' },
  medium: { label: 'Medium', color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-300', bar: 'bg-yellow-500', dot: 'bg-yellow-500' },
  low: { label: 'Low', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300', bar: 'bg-red-500', dot: 'bg-red-500' },
};

export { getConfidenceLevel };

export default function ConfidenceIndicator({ score, variant }: ConfidenceIndicatorProps) {
  const level = getConfidenceLevel(score);
  const config = levelConfig[level];
  const pct = Math.round(score * 100);

  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}>
        {config.label} ({pct}%)
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center space-x-1 text-xs">
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span className={`font-medium ${config.color}`}>{pct}%</span>
      </span>
    );
  }

  // full variant - progress bar
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-medium ${config.color}`}>{config.label} Confidence</span>
        <span className={`font-medium ${config.color}`}>{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${config.bar} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
