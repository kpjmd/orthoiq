'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  IntelligenceCardData,
  AgentStakeData,
  CardTier,
  getTierConfig,
  formatCardTimestamp,
  getAgentFullName
} from '@/lib/intelligenceCardUtils';

interface IntelligenceCardProps {
  data: IntelligenceCardData;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  isMiniApp?: boolean;
}

// SVG dimensions
const CARD_WIDTH = 450;
const CARD_HEIGHT = 600;

// Generate pattern ID to avoid collisions
const generatePatternId = (base: string, caseId: string) =>
  `${base}-${caseId.slice(-6)}`;

// Generative Border Patterns Component
function GenerativeBorder({
  agents,
  consensus,
  tier,
  caseId
}: {
  agents: AgentStakeData[];
  consensus: number;
  tier: CardTier;
  caseId: string;
}) {
  const tierConfig = getTierConfig(tier);
  const patternOpacity = consensus >= 90 ? 0.25 : consensus >= 80 ? 0.2 : 0.15;

  // Get the primary color based on tier
  const getTierPatternColor = () => {
    switch (tier) {
      case 'exceptional':
        return '#8b5cf6';
      case 'verified':
        return '#fbbf24';
      case 'complete':
        return '#14b8a6';
      default:
        return '#3b82f6';
    }
  };

  const patternColor = getTierPatternColor();
  const holoGradId = generatePatternId('holoGrad', caseId);
  const triagePatternId = generatePatternId('triagePattern', caseId);

  return (
    <g className="border-patterns" opacity={patternOpacity}>
      {/* Definitions for patterns and gradients */}
      <defs>
        {tier === 'exceptional' && (
          <linearGradient id={holoGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4">
              <animate
                attributeName="stop-color"
                values="#8b5cf6;#3b82f6;#8b5cf6"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4">
              <animate
                attributeName="stop-color"
                values="#3b82f6;#8b5cf6;#3b82f6"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        )}

        {/* Triage Grid Pattern */}
        <pattern
          id={triagePatternId}
          x="0"
          y="0"
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <rect
            width="30"
            height="30"
            fill="none"
            stroke={patternColor}
            strokeWidth="1"
            opacity="0.3"
          />
        </pattern>
      </defs>

      {/* Base grid pattern (always present for triage) */}
      {agents.some(a => a.specialist === 'triage') && (
        <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill={`url(#${triagePatternId})`} />
      )}

      {/* Pain Whisperer - Waves */}
      {agents.some(a => a.specialist === 'painWhisperer') && (
        <>
          <path
            d={`M0,50 Q30,30 60,50 T120,50 T180,50 T240,50 T300,50 T360,50 T420,50 T480,50`}
            stroke={patternColor}
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          />
          <path
            d={`M0,250 Q30,230 60,250 T120,250 T180,250 T240,250 T300,250 T360,250 T420,250 T480,250`}
            stroke={patternColor}
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          />
          <path
            d={`M0,450 Q30,430 60,450 T120,450 T180,450 T240,450 T300,450 T360,450 T420,450 T480,450`}
            stroke={patternColor}
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          />
        </>
      )}

      {/* Movement Detective - Diagonals */}
      {agents.some(a => a.specialist === 'movementDetective') && (
        <>
          <line x1="0" y1="0" x2={CARD_WIDTH} y2={CARD_HEIGHT} stroke={patternColor} strokeWidth="1" opacity="0.2" />
          <line x1="100" y1="0" x2={CARD_WIDTH} y2="500" stroke={patternColor} strokeWidth="1" opacity="0.2" />
          <line x1="0" y1="100" x2="350" y2={CARD_HEIGHT} stroke={patternColor} strokeWidth="1" opacity="0.2" />
        </>
      )}

      {/* Strength Sage - Circles */}
      {agents.some(a => a.specialist === 'strengthSage') && (
        <>
          <circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT / 2} r="200" fill="none" stroke={patternColor} strokeWidth="1" opacity="0.2" />
          <circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT / 2} r="160" fill="none" stroke={patternColor} strokeWidth="1" opacity="0.2" />
          <circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT / 2} r="120" fill="none" stroke={patternColor} strokeWidth="1" opacity="0.2" />
        </>
      )}

      {/* Mind Mender - Fractals/Diamonds */}
      {agents.some(a => a.specialist === 'mindMender') && (
        <>
          <path d="M100,150 L150,100 L200,150 L150,200 Z" fill="none" stroke={patternColor} strokeWidth="1" opacity="0.2" />
          <path d="M250,450 L300,400 L350,450 L300,500 Z" fill="none" stroke={patternColor} strokeWidth="1" opacity="0.2" />
          <path d="M320,120 L360,80 L400,120 L360,160 Z" fill="none" stroke={patternColor} strokeWidth="1" opacity="0.15" />
        </>
      )}
    </g>
  );
}

// Agent Panel Component
function AgentPanel({
  agents,
  totalStake,
  consensus
}: {
  agents: AgentStakeData[];
  totalStake: number;
  consensus: number;
}) {
  const panelY = 80;
  const agentStartY = 145;
  const agentSpacing = 28;

  return (
    <g className="agent-panel">
      {/* Panel background */}
      <rect
        x="24"
        y={panelY}
        width={CARD_WIDTH - 48}
        height={40 + agents.length * agentSpacing + 40}
        rx="12"
        fill="rgba(30, 41, 59, 0.6)"
        stroke="rgba(59, 130, 246, 0.3)"
        strokeWidth="1"
      />

      {/* Panel header */}
      <text x="40" y={panelY + 28} fill="#cbd5e1" fontSize="11" fontWeight="600" textAnchor="start">
        AGENT PANEL CONSENSUS
      </text>

      {/* Consensus badge */}
      <rect
        x={CARD_WIDTH - 90}
        y={panelY + 12}
        width="55"
        height="24"
        rx="12"
        fill="url(#consensusGradient)"
      />
      <defs>
        <linearGradient id="consensusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <text
        x={CARD_WIDTH - 62}
        y={panelY + 29}
        fill="white"
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
      >
        {consensus}%
      </text>

      {/* Consensus meter */}
      <rect
        x="40"
        y={panelY + 48}
        width={CARD_WIDTH - 80}
        height="6"
        rx="3"
        fill="rgba(51, 65, 85, 0.5)"
      />
      <rect
        x="40"
        y={panelY + 48}
        width={((CARD_WIDTH - 80) * consensus) / 100}
        height="6"
        rx="3"
        fill="url(#meterGradient)"
      />
      <defs>
        <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <text
        x={CARD_WIDTH - 40}
        y={panelY + 68}
        fill="#64748b"
        fontSize="9"
        textAnchor="end"
      >
        Inter-agent agreement
      </text>

      {/* Agent list */}
      {agents.map((agent, index) => (
        <g key={agent.specialist} className="agent-item">
          {/* Agent row background */}
          <rect
            x="40"
            y={agentStartY + index * agentSpacing - 10}
            width={CARD_WIDTH - 80}
            height="24"
            rx="6"
            fill="rgba(15, 23, 42, 0.4)"
          />
          {/* Left border accent */}
          <rect
            x="40"
            y={agentStartY + index * agentSpacing - 10}
            width="3"
            height="24"
            rx="1.5"
            fill={agent.color}
          />
          {/* Agent icon */}
          <circle
            cx="56"
            cy={agentStartY + index * agentSpacing + 2}
            r="4"
            fill={agent.color}
          />
          {/* Agent name */}
          <text
            x="68"
            y={agentStartY + index * agentSpacing + 6}
            fill="#e2e8f0"
            fontSize="11"
          >
            {agent.agentName}
          </text>
          {/* Token stake */}
          <text
            x={CARD_WIDTH - 80}
            y={agentStartY + index * agentSpacing + 6}
            fill="#fbbf24"
            fontSize="11"
            fontWeight="600"
            textAnchor="end"
          >
            {agent.tokenStake.toFixed(1)} tokens
          </text>
          {/* Check mark */}
          <text
            x={CARD_WIDTH - 52}
            y={agentStartY + index * agentSpacing + 6}
            fill="#10b981"
            fontSize="12"
          >
            ✓
          </text>
        </g>
      ))}

      {/* Total stake */}
      <line
        x1="40"
        y1={agentStartY + agents.length * agentSpacing + 8}
        x2={CARD_WIDTH - 40}
        y2={agentStartY + agents.length * agentSpacing + 8}
        stroke="rgba(51, 65, 85, 0.5)"
        strokeWidth="1"
      />
      <text
        x={CARD_WIDTH - 40}
        y={agentStartY + agents.length * agentSpacing + 28}
        fill="#cbd5e1"
        fontSize="11"
        fontWeight="600"
        textAnchor="end"
      >
        Total Stake: <tspan fill="#fbbf24" fontWeight="700">{totalStake.toFixed(1)} tokens</tspan>
      </text>
    </g>
  );
}

// Primary Prediction Component
function PrimaryPrediction({
  prediction,
  yOffset
}: {
  prediction: IntelligenceCardData['primaryPrediction'];
  yOffset: number;
}) {
  return (
    <g className="primary-prediction">
      <rect
        x="24"
        y={yOffset}
        width={CARD_WIDTH - 48}
        height="70"
        rx="10"
        fill="rgba(59, 130, 246, 0.1)"
        stroke="rgba(59, 130, 246, 0.3)"
        strokeWidth="1"
      />
      <text x="40" y={yOffset + 20} fill="#94a3b8" fontSize="9" fontWeight="600">
        PRIMARY PREDICTION{prediction.validated ? ' • VALIDATED ✓' : ''}
      </text>
      <text x="40" y={yOffset + 42} fill="#e2e8f0" fontSize="12" fontWeight="500">
        {prediction.text.length > 50 ? prediction.text.substring(0, 47) + '...' : prediction.text}
      </text>
      <text x="40" y={yOffset + 60} fill="#64748b" fontSize="10">
        Staked by <tspan fill="#8b5cf6" fontWeight="600">{prediction.agent}</tspan>, {prediction.stake.toFixed(1)} tokens
        {prediction.actualOutcome && (
          <tspan fill="#10b981" fontWeight="600"> • Outcome: {prediction.actualOutcome}</tspan>
        )}
      </text>
    </g>
  );
}

// Verification Status Component
function VerificationStatus({
  userFeedback,
  mdReview,
  validated,
  yOffset
}: {
  userFeedback: boolean;
  mdReview: boolean;
  validated: boolean;
  yOffset: number;
}) {
  return (
    <g className="verification-status">
      <rect
        x="24"
        y={yOffset}
        width={CARD_WIDTH - 48}
        height="65"
        rx="10"
        fill="rgba(15, 23, 42, 0.6)"
      />
      <text x="40" y={yOffset + 18} fill="#94a3b8" fontSize="9" fontWeight="600">
        OUTCOME VERIFICATION
      </text>

      {/* User Feedback Status */}
      <rect
        x="40"
        y={yOffset + 28}
        width={(CARD_WIDTH - 100) / 2}
        height="30"
        rx="6"
        fill="rgba(30, 41, 59, 0.5)"
        stroke={userFeedback ? 'rgba(16, 185, 129, 0.5)' : 'rgba(251, 191, 36, 0.5)'}
        strokeWidth="1"
      />
      <text
        x={40 + (CARD_WIDTH - 100) / 4}
        y={yOffset + 40}
        fill={userFeedback ? '#10b981' : '#fbbf24'}
        fontSize="14"
        textAnchor="middle"
      >
        {userFeedback ? '✓' : '⏳'}
      </text>
      <text
        x={40 + (CARD_WIDTH - 100) / 4}
        y={yOffset + 54}
        fill="#cbd5e1"
        fontSize="9"
        textAnchor="middle"
      >
        {validated ? 'Validated' : 'Feedback'}
      </text>

      {/* MD Review Status */}
      <rect
        x={60 + (CARD_WIDTH - 100) / 2}
        y={yOffset + 28}
        width={(CARD_WIDTH - 100) / 2}
        height="30"
        rx="6"
        fill="rgba(30, 41, 59, 0.5)"
        stroke={mdReview ? 'rgba(16, 185, 129, 0.5)' : 'rgba(251, 191, 36, 0.5)'}
        strokeWidth="1"
      />
      <text
        x={60 + (CARD_WIDTH - 100) / 2 + (CARD_WIDTH - 100) / 4}
        y={yOffset + 40}
        fill={mdReview ? '#10b981' : '#fbbf24'}
        fontSize="14"
        textAnchor="middle"
      >
        {mdReview ? '✓' : '⏳'}
      </text>
      <text
        x={60 + (CARD_WIDTH - 100) / 2 + (CARD_WIDTH - 100) / 4}
        y={yOffset + 54}
        fill="#cbd5e1"
        fontSize="9"
        textAnchor="middle"
      >
        {mdReview ? 'MD Verified' : 'MD Review'}
      </text>
    </g>
  );
}

// QR Section Component
function QRSection({ caseId, yOffset, isMobile }: { caseId: string; yOffset: number; isMobile: boolean }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR code data URL
    const trackingUrl = `https://orthoiq.vercel.app/track/${caseId}`;
    QRCode.toDataURL(trackingUrl, {
      width: 80,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    }).then(setQrDataUrl).catch(console.error);
  }, [caseId]);

  // Hide QR section on mobile
  if (isMobile) {
    return null;
  }

  return (
    <g className="qr-section">
      <rect
        x="24"
        y={yOffset}
        width={CARD_WIDTH - 48}
        height="55"
        rx="10"
        fill="rgba(30, 41, 59, 0.4)"
      />
      {/* QR Code */}
      {qrDataUrl ? (
        <image
          x="36"
          y={yOffset + 8}
          width="40"
          height="40"
          href={qrDataUrl}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <>
          <rect
            x="36"
            y={yOffset + 8}
            width="40"
            height="40"
            rx="6"
            fill="white"
          />
          <text
            x="56"
            y={yOffset + 32}
            fill="#64748b"
            fontSize="8"
            textAnchor="middle"
          >
            QR
          </text>
        </>
      )}

      {/* QR Info */}
      <text x="88" y={yOffset + 22} fill="#e2e8f0" fontSize="11" fontWeight="600">
        Track Predictions
      </text>
      <text x="88" y={yOffset + 38} fill="#64748b" fontSize="9">
        Scan to view specialist insights
      </text>
      <text x="88" y={yOffset + 50} fill="#64748b" fontSize="9">
        and milestone tracking
      </text>
    </g>
  );
}

// Card Footer Component
function CardFooter({
  timestamp,
  evidenceGrade,
  mdVerified,
  tier,
  yOffset
}: {
  timestamp: string;
  evidenceGrade?: string;
  mdVerified: boolean;
  tier: CardTier;
  yOffset: number;
}) {
  return (
    <g className="card-footer">
      <line
        x1="24"
        y1={yOffset}
        x2={CARD_WIDTH - 24}
        y2={yOffset}
        stroke="rgba(51, 65, 85, 0.3)"
        strokeWidth="1"
      />

      {/* Badges */}
      {mdVerified && (
        <g>
          <rect
            x="24"
            y={yOffset + 10}
            width="75"
            height="20"
            rx="4"
            fill="url(#mdBadgeGradient)"
          />
          <defs>
            <linearGradient id="mdBadgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <text
            x="62"
            y={yOffset + 24}
            fill="white"
            fontSize="8"
            fontWeight="600"
            textAnchor="middle"
          >
            ✓ MD VERIFIED
          </text>
        </g>
      )}

      {evidenceGrade && (
        <rect
          x={mdVerified ? 108 : 24}
          y={yOffset + 10}
          width="55"
          height="20"
          rx="4"
          fill="rgba(251, 191, 36, 0.2)"
          stroke="rgba(251, 191, 36, 0.3)"
          strokeWidth="1"
        />
      )}
      {evidenceGrade && (
        <text
          x={(mdVerified ? 108 : 24) + 27.5}
          y={yOffset + 24}
          fill="#fbbf24"
          fontSize="8"
          fontWeight="600"
          textAnchor="middle"
        >
          GRADE {evidenceGrade}
        </text>
      )}

      {/* Meta info */}
      <text
        x={CARD_WIDTH - 24}
        y={yOffset + 18}
        fill="#64748b"
        fontSize="9"
        textAnchor="end"
      >
        {formatCardTimestamp(timestamp)}
      </text>
      <text
        x={CARD_WIDTH - 24}
        y={yOffset + 30}
        fill="#64748b"
        fontSize="9"
        textAnchor="end"
      >
        Base ⬡
      </text>
    </g>
  );
}

// Main Intelligence Card Component
export function IntelligenceCard({
  data,
  size = 'medium',
  animated = true,
  isMiniApp = false
}: IntelligenceCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detect mobile device
    const checkMobile = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide QR for miniapp or mobile
  const shouldHideQR = isMiniApp || isMobile;

  const tierConfig = getTierConfig(data.tier);

  // Calculate dynamic Y offsets based on agent count
  const agentPanelHeight = 80 + data.agentStakes.length * 28 + 40;
  const predictionY = 90 + agentPanelHeight + 12;
  const verificationY = predictionY + 82;
  const qrY = verificationY + 77;
  // Adjust footer Y based on whether QR is shown
  const footerY = shouldHideQR ? verificationY + 77 : qrY + 65;

  // Calculate dynamic card height based on content
  // Footer requires ~45px, add padding
  const dynamicCardHeight = footerY + 50;
  const cardHeight = Math.max(CARD_HEIGHT, dynamicCardHeight);

  // Size multipliers
  const sizeMultiplier = size === 'small' ? 0.7 : size === 'large' ? 1.2 : 1;
  const scaledWidth = CARD_WIDTH * sizeMultiplier;
  const scaledHeight = cardHeight * sizeMultiplier;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CARD_WIDTH} ${cardHeight}`}
      width={scaledWidth}
      height={scaledHeight}
      className={`intelligence-card tier-${data.tier}`}
      style={{
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: data.tier === 'exceptional'
          ? '0 25px 50px -12px rgba(139, 92, 246, 0.4)'
          : data.tier === 'verified'
          ? '0 25px 50px -12px rgba(251, 191, 36, 0.3)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Background */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={tierConfig.gradientFrom} />
          <stop offset="100%" stopColor={tierConfig.gradientTo} />
        </linearGradient>
      </defs>
      <rect
        width={CARD_WIDTH}
        height={cardHeight}
        fill="url(#bgGradient)"
      />

      {/* Border */}
      <rect
        x="1"
        y="1"
        width={CARD_WIDTH - 2}
        height={cardHeight - 2}
        rx="23"
        fill="none"
        stroke={tierConfig.borderColor}
        strokeWidth="2"
      />

      {/* Generative Border Patterns */}
      <GenerativeBorder
        agents={data.agentStakes}
        consensus={data.consensusPercentage}
        tier={data.tier}
        caseId={data.caseId}
      />

      {/* Card Header */}
      <text
        x={CARD_WIDTH / 2}
        y="40"
        fill="url(#titleGradient)"
        fontSize="20"
        fontWeight="700"
        textAnchor="middle"
      >
        Intelligence Card
      </text>
      <defs>
        <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <text
        x={CARD_WIDTH / 2}
        y="58"
        fill="#94a3b8"
        fontSize="11"
        textAnchor="middle"
      >
        Case #{data.caseId}{data.tier === 'exceptional' ? ' • Top 5%' : ''}
      </text>

      {/* Agent Panel */}
      <AgentPanel
        agents={data.agentStakes}
        totalStake={data.totalStake}
        consensus={data.consensusPercentage}
      />

      {/* Primary Prediction */}
      <PrimaryPrediction
        prediction={data.primaryPrediction}
        yOffset={predictionY}
      />

      {/* Verification Status */}
      <VerificationStatus
        userFeedback={data.userFeedbackComplete}
        mdReview={data.mdReviewComplete}
        validated={data.outcomeValidated}
        yOffset={verificationY}
      />

      {/* QR Section - hidden on mobile and miniapp */}
      <QRSection
        caseId={data.caseId}
        yOffset={qrY}
        isMobile={shouldHideQR}
      />

      {/* Footer */}
      <CardFooter
        timestamp={data.timestamp}
        evidenceGrade={data.evidenceGrade}
        mdVerified={data.mdVerified}
        tier={data.tier}
        yOffset={footerY}
      />
    </svg>
  );
}

export default IntelligenceCard;
