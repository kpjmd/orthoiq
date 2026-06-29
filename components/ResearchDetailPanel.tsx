'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchState } from '@/lib/types';

interface ResearchDetailPanelProps {
  researchState: ResearchState;
  // kept for call-site compatibility; no longer used (citations retired in
  // favor of the per-decision evidence ledger on the equipoise card).
  isMiniApp?: boolean;
}

// The stance-tagged evidence ledger on each equipoise card is now THE evidence
// (A1). This panel is demoted to the plain-language case-level "Background"
// intro prose only — the one layer the per-decision ledger does not provide.
// The citation grid and search terms are intentionally dropped.
export default function ResearchDetailPanel({ researchState }: ResearchDetailPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (researchState.status !== 'complete' || !researchState.result) return null;

  const { result } = researchState;
  if (!result.intro) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="border-t bg-gradient-to-b from-indigo-50 to-white"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-indigo-50/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">📖</span>
          <h4 className="font-semibold text-indigo-900">Background</h4>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="prose prose-sm max-w-none text-left prose-p:text-gray-700 prose-p:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.intro}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
