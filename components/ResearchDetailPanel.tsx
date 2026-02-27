'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchState, ResearchCitation } from '@/lib/types';

interface ResearchDetailPanelProps {
  researchState: ResearchState;
}

const qualityConfig = {
  high: { label: 'High Quality', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  moderate: { label: 'Moderate', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  low: { label: 'Low Quality', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

function CitationCard({ citation }: { citation: ResearchCitation }) {
  const quality = qualityConfig[citation.quality] || qualityConfig.moderate;
  const authorDisplay = citation.authors.length > 3
    ? `${citation.authors.slice(0, 3).join(', ')} et al.`
    : citation.authors.join(', ');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${quality.bg} ${quality.text} ${quality.border} border`}>
          {quality.label}
        </span>
        {citation.pubmedUrl && (
          <a
            href={citation.pubmedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            PubMed &rsaquo;
          </a>
        )}
      </div>
      <h5 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{citation.title}</h5>
      <p className="text-xs text-gray-500 mb-1">{authorDisplay}</p>
      <div className="flex items-center space-x-2 text-xs text-gray-400">
        <span>{citation.journal}</span>
        <span>&middot;</span>
        <span>{citation.year}</span>
      </div>
    </div>
  );
}

export default function ResearchDetailPanel({ researchState }: ResearchDetailPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (researchState.status !== 'complete' || !researchState.result) return null;

  const { result } = researchState;

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
          <span className="text-lg">📚</span>
          <h4 className="font-semibold text-indigo-900">Research Evidence</h4>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
            {result.totalStudiesFound} {result.totalStudiesFound === 1 ? 'study' : 'studies'}
          </span>
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
            <div className="px-4 pb-4 space-y-4">
              {/* Research Intro */}
              {result.intro && (
                <div className="prose prose-sm max-w-none text-left prose-p:text-gray-700 prose-p:leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result.intro}
                  </ReactMarkdown>
                </div>
              )}

              {/* Citation Cards */}
              {result.citations.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.citations.map((citation) => (
                    <CitationCard key={citation.pmid} citation={citation} />
                  ))}
                </div>
              )}

              {/* Search Terms */}
              {result.searchTerms.length > 0 && (
                <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                  <span className="font-medium">Search terms:</span>{' '}
                  {result.searchTerms.join(', ')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
