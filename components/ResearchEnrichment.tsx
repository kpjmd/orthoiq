'use client';

import React, { useState } from 'react';
import { ResearchRarity } from '@/lib/types';

interface ResearchEnrichmentProps {
  enrichment: {
    type: string;
    title: string;
    content: string;
    metadata?: {
      studyCount?: number;
      evidenceStrength?: string;
      publicationYears?: string;
      nftEligible?: boolean;
    };
    nftEligible?: boolean;
    rarityTier?: ResearchRarity;
  };
  questionId?: number;
  fid: string;
}

const RARITY_COLORS = {
  bronze: {
    border: 'border-amber-600',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    accent: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800'
  },
  silver: {
    border: 'border-gray-400',
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    accent: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-800'
  },
  gold: {
    border: 'border-yellow-400',
    bg: 'bg-yellow-50',
    text: 'text-yellow-900',
    accent: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  platinum: {
    border: 'border-purple-400',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    accent: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-800'
  }
};

export default function ResearchEnrichment({ enrichment, questionId, fid }: ResearchEnrichmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingNFT, setIsGeneratingNFT] = useState(false);

  const rarity = enrichment.rarityTier || 'bronze';
  const colors = RARITY_COLORS[rarity];

  const handleGenerateNFT = async () => {
    if (!questionId || !enrichment.nftEligible) return;

    setIsGeneratingNFT(true);
    try {
      const response = await fetch('/api/research/nft/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          fid,
          enrichmentType: enrichment.type,
          title: enrichment.title,
          rarity: enrichment.rarityTier
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Show success message or redirect to NFT view
        console.log('NFT generation initiated:', result);
      } else {
        console.error('NFT generation failed:', await response.text());
      }
    } catch (error) {
      console.error('Error generating NFT:', error);
    }
    setIsGeneratingNFT(false);
  };

  const formatContent = (content: string) => {
    // Convert markdown-like formatting to JSX
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h3 key={index} className={`text-lg font-semibold ${colors.text} mb-2`}>{line.substring(2)}</h3>;
      } else if (line.startsWith('## ')) {
        return <h4 key={index} className={`text-md font-medium ${colors.text} mb-1 mt-3`}>{line.substring(3)}</h4>;
      } else if (line.startsWith('• ') || line.startsWith('- ')) {
        return <li key={index} className={`${colors.text} ml-4 mb-1`}>{line.substring(2)}</li>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else if (line.startsWith('*') && line.endsWith('*')) {
        return <em key={index} className={`${colors.accent} block text-sm mb-1`}>{line.slice(1, -1)}</em>;
      } else {
        return <p key={index} className={`${colors.text} mb-2`}>{line}</p>;
      }
    });
  };

  return (
    <div className={`mt-4 border-2 ${colors.border} rounded-lg ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${colors.border} bg-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <svg className={`w-5 h-5 ${colors.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className={`font-semibold ${colors.text}`}>{enrichment.title}</h3>
            </div>
            
            {/* Rarity badge */}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors.badge} capitalize`}>
              {rarity} Research
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* NFT Generation Button */}
            {enrichment.nftEligible && (
              <button
                onClick={handleGenerateNFT}
                disabled={isGeneratingNFT}
                className={`px-3 py-1 text-xs font-medium rounded-md border ${colors.border} ${colors.bg} ${colors.text} hover:opacity-75 disabled:opacity-50`}
              >
                {isGeneratingNFT ? '⏳ Minting...' : '🎯 Mint NFT'}
              </button>
            )}

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-3 py-1 text-xs font-medium rounded-md ${colors.accent} hover:opacity-75`}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Metadata */}
        {enrichment.metadata && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {enrichment.metadata.studyCount && (
              <span className={colors.text}>
                <strong>Studies:</strong> {enrichment.metadata.studyCount}
              </span>
            )}
            {enrichment.metadata.evidenceStrength && (
              <span className={colors.text}>
                <strong>Evidence:</strong> {enrichment.metadata.evidenceStrength}
              </span>
            )}
            {enrichment.metadata.publicationYears && (
              <span className={colors.text}>
                <strong>Years:</strong> {enrichment.metadata.publicationYears}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          <div className="prose prose-sm max-w-none">
            {formatContent(enrichment.content)}
          </div>
        </div>
      )}

      {/* Quick preview when collapsed */}
      {!isExpanded && (
        <div className="p-4">
          <p className={`${colors.text} text-sm line-clamp-2`}>
            {enrichment.content.split('\n').find(line => line.trim() && !line.startsWith('#'))?.substring(0, 150)}...
          </p>
        </div>
      )}
    </div>
  );
}