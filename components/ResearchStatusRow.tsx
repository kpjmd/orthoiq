'use client';

import { ResearchState } from '@/lib/types';

interface ResearchStatusRowProps {
  researchState: ResearchState;
  onViewFull?: () => void;
}

export default function ResearchStatusRow({ researchState, onViewFull }: ResearchStatusRowProps) {
  if (researchState.status === 'idle') return null;

  if (researchState.status === 'pending') {
    return (
      <div className="flex items-center space-x-3 py-3 border-b border-gray-100">
        <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
          <span className="text-base">📚</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-indigo-900">Research</span>
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            <div className="h-2 flex-1 max-w-[160px] bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-shimmer" />
            </div>
            <span className="text-xs text-indigo-600 animate-pulse">Searching medical databases...</span>
          </div>
        </div>
      </div>
    );
  }

  if (researchState.status === 'complete' && researchState.result) {
    const count = researchState.result.totalStudiesFound;
    return (
      <div className="flex items-center space-x-3 py-3 border-b border-gray-100">
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <span className="text-base">📚</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-0.5">
            <span className="text-sm font-semibold text-green-900">Research</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
              {count} {count === 1 ? 'study' : 'studies'} found
            </span>
          </div>
          <p className="text-xs text-gray-600">Evidence-based research supporting this consultation</p>
        </div>
        {onViewFull && (
          <button
            onClick={onViewFull}
            className="flex-shrink-0 text-xs text-medical-primary hover:text-medical-accent font-medium whitespace-nowrap transition-colors"
          >
            View Full &rsaquo;
          </button>
        )}
      </div>
    );
  }

  if (researchState.status === 'failed') {
    return (
      <div className="flex items-center space-x-3 py-3 border-b border-gray-100">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-base">📚</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-500">Research</span>
          <p className="text-xs text-gray-400 mt-0.5">Research unavailable</p>
        </div>
      </div>
    );
  }

  return null;
}
