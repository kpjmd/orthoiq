'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import {
  IntelligenceCardData,
  getTierConfig,
  formatCardTimestamp
} from '@/lib/intelligenceCardUtils';

interface WebIntelligenceCardProps {
  data: IntelligenceCardData;
  caseId: string;
}

export default function WebIntelligenceCard({ data, caseId }: WebIntelligenceCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  const FARCASTER_REFERRAL = 'https://farcaster.xyz/~/code/HPGS71';
  const BASEAPP_REFERRAL = 'https://base.app/invite/friends/D1KBCSXG';

  const tierConfig = getTierConfig(data.tier);

  useEffect(() => {
    // Detect mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Generate QR code
    const trackingUrl = `https://orthoiq.vercel.app/track/${caseId}`;
    QRCode.toDataURL(trackingUrl, {
      width: 80,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    }).then(setQrDataUrl).catch(console.error);

    return () => window.removeEventListener('resize', checkMobile);
  }, [caseId]);

  // Get tier badge color
  const getTierBadgeClass = () => {
    switch (data.tier) {
      case 'exceptional':
        return 'bg-purple-600 text-white';
      case 'verified':
        return 'bg-amber-500 text-white';
      case 'complete':
        return 'bg-teal-500 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Intelligence Card
            </h3>
            <p className="text-xs text-slate-400">Case #{data.caseId}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTierBadgeClass()}`}>
            {tierConfig.label}
          </span>
        </div>
      </div>

      {/* Primary Prediction */}
      <div className="p-4 bg-blue-900/20 border-b border-slate-700">
        <p className="text-xs text-slate-400 font-semibold mb-2">PRIMARY PREDICTION</p>
        <p className="text-sm text-slate-200 font-medium mb-2">
          {data.primaryPrediction.text}
        </p>
        <div className="flex items-center text-xs text-slate-400">
          <span className="text-purple-400 font-medium">{data.primaryPrediction.agent}</span>
          <span className="mx-2">•</span>
          <span className="text-amber-400 font-semibold">{data.primaryPrediction.stake.toFixed(1)} tokens</span>
        </div>
      </div>

      {/* Agent Stakes - Horizontal pills */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400 font-semibold">AGENT CONSENSUS</p>
          <span className="px-2 py-0.5 bg-green-600/80 text-white text-xs font-bold rounded-full">
            {data.consensusPercentage}%
          </span>
        </div>

        {/* Consensus bar */}
        <div className="w-full h-1.5 bg-slate-700 rounded-full mb-3">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${data.consensusPercentage}%` }}
          />
        </div>

        {/* Agent pills */}
        <div className="flex flex-wrap gap-2">
          {data.agentStakes.map((agent) => (
            <div
              key={agent.specialist}
              className="flex items-center px-2 py-1 bg-slate-800 rounded-full border border-slate-600"
            >
              <div
                className="w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: agent.color }}
              />
              <span className="text-xs text-slate-300 font-medium">{agent.agentName}</span>
              <span className="text-xs text-amber-400 font-semibold ml-1.5">{agent.tokenStake.toFixed(1)}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 text-right">
          <span className="text-xs text-slate-400">
            Total Stake: <span className="text-amber-400 font-bold">{data.totalStake.toFixed(1)} tokens</span>
          </span>
        </div>
      </div>

      {/* QR Code - Desktop only */}
      {!isMobile && qrDataUrl && (
        <div className="p-4 border-b border-slate-700 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Code" className="w-12 h-12 rounded-md" />
          <div className="ml-3">
            <p className="text-sm text-slate-200 font-medium">Track Predictions</p>
            <p className="text-xs text-slate-400">Scan for milestone updates</p>
          </div>
        </div>
      )}

      {/* Footer with timestamp */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-500">
        <span>{formatCardTimestamp(data.timestamp)}</span>
        <span>Base ⬡</span>
      </div>

      {/* Upgrade CTA */}
      <div className="p-4 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-t border-purple-500/30">
        <p className="text-sm text-slate-200 font-medium text-center mb-3">
          Get the full agent analysis on our mini apps
        </p>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={FARCASTER_REFERRAL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all text-white text-sm font-medium"
          >
            <span className="mr-1.5">🟣</span> Farcaster
          </a>
          <a
            href={BASEAPP_REFERRAL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-white text-sm font-medium"
          >
            <span className="mr-1.5">🔵</span> BaseApp
          </a>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Full card with animations, detailed insights & NFT mint
        </p>
      </div>
    </motion.div>
  );
}
