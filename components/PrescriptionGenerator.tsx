'use client';

import React, { useMemo, useRef } from 'react';
import OrthoIQLogo from './OrthoIQLogo';
import { PrescriptionData, PrescriptionMetadata } from '@/lib/types';
import { 
  parseClaudeResponse, 
  calculateRarity, 
  calculateQuestionComplexity,
  generateMetadata,
  generateVerificationHash,
  RARITY_CONFIGS
} from '@/lib/prescriptionUtils';

interface PrescriptionGeneratorProps {
  data: PrescriptionData;
  size?: number;
  className?: string;
  onGenerated?: (metadata: PrescriptionMetadata) => void;
  mdReviewed?: boolean;
  mdReviewerName?: string;
  storedMetadata?: Partial<PrescriptionMetadata>;
}

export default function PrescriptionGenerator({ 
  data, 
  size = 600, 
  className = "",
  onGenerated,
  mdReviewed = false,
  mdReviewerName,
  storedMetadata
}: PrescriptionGeneratorProps) {
  const prescriptionRef = useRef<SVGSVGElement>(null);

  const prescriptionMetadata = useMemo(() => {
    // If stored metadata is provided, use it
    if (storedMetadata?.id && storedMetadata?.rarity) {
      console.log('PrescriptionGenerator: Using stored metadata:', storedMetadata);
      // Find the rarity config for the stored rarity
      const rarityConfig = RARITY_CONFIGS.find(r => r.name === storedMetadata.rarity) || RARITY_CONFIGS[0];
      return {
        id: storedMetadata.id,
        rarity: storedMetadata.rarity,
        theme: storedMetadata.theme || rarityConfig.theme,
        generatedAt: new Date().toISOString(),
        verificationHash: storedMetadata.verificationHash || generateVerificationHash(data),
        patientId: `ANON-${data.fid}`,
        prescriberId: 'ORTHOIQ-AI-001',
        watermarkType: storedMetadata.rarity === 'common' ? 'none' : 
                      storedMetadata.rarity === 'uncommon' ? 'medical_pattern' :
                      storedMetadata.rarity === 'rare' ? 'gold_caduceus' : 'holographic'
      } as PrescriptionMetadata;
    }
    
    // Otherwise generate new metadata with deterministic seed for consistency
    console.log('PrescriptionGenerator: Generating metadata for data:', data);
    const seed = `${data.userQuestion}${data.claudeResponse}${data.fid}`;
    const complexity = calculateQuestionComplexity(data.userQuestion);
    const rarity = calculateRarity(data.confidence, complexity, seed);
    const metadata = generateMetadata(data, rarity, true); // Use deterministic generation
    console.log('PrescriptionGenerator: Generated metadata:', metadata);
    return metadata;
  }, [data, storedMetadata]);

  // Effect to call onGenerated callback when metadata is ready
  React.useEffect(() => {
    console.log('PrescriptionGenerator: useEffect triggered', { onGenerated: !!onGenerated, prescriptionMetadata: !!prescriptionMetadata });
    if (onGenerated && prescriptionMetadata) {
      console.log('PrescriptionGenerator: Calling onGenerated callback');
      onGenerated(prescriptionMetadata);
    }
  }, [onGenerated, prescriptionMetadata]);

  const parsedResponse = useMemo(() => {
    return parseClaudeResponse(data.claudeResponse, { 
      inquiry: data.inquiry, 
      keyPoints: data.keyPoints,
      userQuestion: data.userQuestion
    });
  }, [data.claudeResponse, data.inquiry, data.keyPoints, data.userQuestion]);

  const theme = prescriptionMetadata.theme;
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };



  return (
    <div className={`prescription-container ${className}`}>
      <div className={`bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto ${theme.effects.join(' ')}`}>
        {/* Rarity Effects - Simplified */}
        {prescriptionMetadata.rarity === 'ultra-rare' && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-indigo-400/10 rounded-lg"></div>
        )}
        
        <svg 
          ref={prescriptionRef}
          width={size} 
          height={size * 1.4} 
          viewBox={`0 0 ${size} ${size * 1.4}`}
          className="w-full border border-gray-200 rounded-lg bg-white"
        >
          <defs>
            <style>
              {`
                .prescription-title { font: bold 24px Arial, sans-serif; fill: ${theme.primaryColor}; }
                .prescription-subtitle { font: 16px Arial, sans-serif; fill: ${theme.accentColor}; }
                .prescription-header { font: bold 14px Arial, sans-serif; fill: #374151; }
                .prescription-text { font: 12px Arial, sans-serif; fill: #4b5563; }
                .prescription-small { font: 10px Arial, sans-serif; fill: #6b7280; }
                .prescription-rx { font: bold 48px serif; fill: ${theme.primaryColor}; }
                .prescription-border { stroke: ${theme.primaryColor}; stroke-width: 2; fill: none; }
              `}
            </style>
            
            {/* Watermark patterns based on rarity */}
            {prescriptionMetadata.rarity === 'uncommon' && (
              <pattern id="medical-pattern" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
                <rect width="40" height="40" fill="rgba(14,116,144,0.03)" />
                <text x="20" y="25" textAnchor="middle" fontSize="20" fill="rgba(14,116,144,0.08)">⚕</text>
              </pattern>
            )}
            
            {prescriptionMetadata.rarity === 'rare' && (
              <>
                <linearGradient id="gold-shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(245,158,11,0.1)" />
                  <stop offset="50%" stopColor="rgba(245,158,11,0.2)" />
                  <stop offset="100%" stopColor="rgba(245,158,11,0.1)" />
                </linearGradient>
                <pattern id="caduceus-pattern" patternUnits="userSpaceOnUse" width="60" height="60" patternTransform="rotate(30)">
                  <rect width="60" height="60" fill="rgba(245,158,11,0.05)" />
                  <text x="30" y="35" textAnchor="middle" fontSize="24" fill="rgba(245,158,11,0.15)">⚕</text>
                </pattern>
              </>
            )}
            
            {prescriptionMetadata.rarity === 'ultra-rare' && (
              <>
                <linearGradient id="holographic-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(139,92,246,0.1)" />
                  <stop offset="25%" stopColor="rgba(236,72,153,0.1)" />
                  <stop offset="50%" stopColor="rgba(59,130,246,0.1)" />
                  <stop offset="75%" stopColor="rgba(16,185,129,0.1)" />
                  <stop offset="100%" stopColor="rgba(139,92,246,0.1)" />
                </linearGradient>
                <pattern id="holographic-pattern" patternUnits="userSpaceOnUse" width="80" height="80">
                  <rect width="80" height="80" fill="url(#holographic-bg)" />
                  <circle cx="40" cy="40" r="15" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="2" />
                  <text x="40" y="48" textAnchor="middle" fontSize="20" fill="rgba(139,92,246,0.3)">✨</text>
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </>
            )}
          </defs>
          
          {/* Background */}
          <rect width={size} height={size * 1.4} fill="white" />
          
          {/* Border */}
          <rect 
            x="20" 
            y="20" 
            width={size - 40} 
            height={size * 1.4 - 40} 
            className="prescription-border" 
            rx="10" 
          />
          
          {/* Watermark overlays based on rarity */}
          {prescriptionMetadata.rarity === 'uncommon' && (
            <rect 
              x="20" 
              y="20" 
              width={size - 40} 
              height={size * 1.4 - 40} 
              fill="url(#medical-pattern)" 
              rx="10" 
            />
          )}
          
          {prescriptionMetadata.rarity === 'rare' && (
            <>
              <rect 
                x="20" 
                y="20" 
                width={size - 40} 
                height={size * 1.4 - 40} 
                fill="url(#gold-shimmer)" 
                rx="10" 
              />
              <rect 
                x="20" 
                y="20" 
                width={size - 40} 
                height={size * 1.4 - 40} 
                fill="url(#caduceus-pattern)" 
                rx="10" 
              />
            </>
          )}
          
          {prescriptionMetadata.rarity === 'ultra-rare' && (
            <>
              <rect 
                x="20" 
                y="20" 
                width={size - 40} 
                height={size * 1.4 - 40} 
                fill="url(#holographic-pattern)" 
                rx="10" 
              />
              <g filter="url(#glow)">
                <rect 
                  x="20" 
                  y="20" 
                  width={size - 40} 
                  height={size * 1.4 - 40} 
                  fill="none" 
                  stroke="rgba(139,92,246,0.4)" 
                  strokeWidth="3" 
                  rx="10" 
                />
              </g>
            </>
          )}
          
          {/* Header */}
          <text x={size / 2} y="60" textAnchor="middle" className="prescription-title">
            OrthoIQ Medical Intelligence
          </text>
          
          <text x={size / 2} y="85" textAnchor="middle" className="prescription-subtitle">
            {mdReviewed ? `MD Reviewed by ${mdReviewerName || 'Dr. KPJMD'}` : 'Board Certified MD Supervised'}
          </text>
          
          <text x={size / 2} y="105" textAnchor="middle" className="prescription-small">
            Orthopedic Surgery / Sports Medicine
          </text>
          
          {/* Logo - OrthoIQ Component */}
          <foreignObject x={size - 90} y="40" width="60" height="60">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <OrthoIQLogo size={60} variant={theme.primaryColor === '#3b82f6' ? 'blue' : theme.primaryColor === '#0891b2' ? 'teal' : 'blue'} />
            </div>
          </foreignObject>
          
          {/* Patient Information Section */}
          <line x1="40" y1="130" x2={size - 40} y2="130" stroke="#e5e7eb" strokeWidth="1" />
          
          <text x="40" y="155" className="prescription-header">PATIENT INFORMATION</text>
          
          <text x="60" y="185" className="prescription-text">
            Name: {data.userEmail ? data.userEmail : data.fid ? `Guest #${data.fid}` : 'Anonymous Guest'}
          </text>
          <text x={size - 300} y="175" className="prescription-text">
            Date: {formatDate(data.timestamp)}
          </text>
          <text x={size - 300} y="195" className="prescription-text">
            Prescription ID: {prescriptionMetadata.id}
          </text>
          
          {/* Prescription Symbol and Body */}
          <line x1="40" y1="220" x2={size - 40} y2="220" stroke="#e5e7eb" strokeWidth="1" />
          
          <text x="60" y="270" className="prescription-rx">℞</text>

          <text x="120" y="255" className="prescription-header">
            {data.enhancedData?.primaryDiagnosis ? 'DIAGNOSIS' : 'CHIEF INQUIRY'}
          </text>
          {(() => {
            // Use primary diagnosis for comprehensive mode, or chief complaint for fast mode
            const inquiry = data.enhancedData?.primaryDiagnosis || parsedResponse.chiefComplaint;
            const maxCharsPerLine = 50; // Shorter than synopsis to account for left margin
            const maxLines = 3;
            const words = inquiry.split(' ');
            const lines = [];
            let currentLine = '';

            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
              } else {
                if (currentLine) {
                  lines.push(currentLine);
                  currentLine = word;
                }
                if (lines.length >= maxLines) break;
              }
            }

            if (currentLine && lines.length < maxLines) {
              lines.push(currentLine);
            }

            // If text was truncated, add ellipsis to last line
            if (words.join(' ').length > lines.join(' ').length) {
              const lastLine = lines[lines.length - 1];
              if (lastLine && lastLine.length > maxCharsPerLine - 3) {
                lines[lines.length - 1] = lastLine.substring(0, maxCharsPerLine - 3) + '...';
              } else if (lastLine) {
                lines[lines.length - 1] = lastLine + '...';
              }
            }

            return lines.map((line, lineIndex) => (
              <text key={lineIndex} x="120" y={275 + (lineIndex * 14)} className="prescription-text">
                {line}
              </text>
            ));
          })()}
          
          {/* Synopsis - Combined Assessment and Recommendations */}
          <text x="60" y="315" className="prescription-header">SYNOPSIS</text>
          {(() => {
            // Build synopsis items based on available data
            let synopsisItems: string[] = [];

            if (data.enhancedData?.topSpecialistInsights && data.enhancedData.topSpecialistInsights.length > 0) {
              // Comprehensive mode: Show specialist insights
              data.enhancedData.topSpecialistInsights.forEach(insight => {
                if (insight?.specialist && insight?.keyInsight) {
                  synopsisItems.push(`${insight.specialist}: ${insight.keyInsight}`);
                }
              });
            }

            if (data.enhancedData?.topRecommendations && data.enhancedData.topRecommendations.length > 0) {
              // Comprehensive mode: Show phase 1 interventions
              data.enhancedData.topRecommendations.forEach(rec => {
                if (rec?.intervention) {
                  synopsisItems.push(rec.intervention);
                }
              });
            }

            // Fallback to legacy parsing if no enhanced data
            if (synopsisItems.length === 0) {
              synopsisItems = [...parsedResponse.assessment.slice(0, 2), ...parsedResponse.recommendations.slice(0, 2)]
                .filter(item => item && typeof item === 'string' && item.trim().length > 0);
            }

            // Render synopsis items
            return synopsisItems.slice(0, 4).map((item, index) => {
              const maxCharsPerLine = 65;
              const maxLines = 2;
              const words = item.split(' ');
              const lines = [];
              let currentLine = '';

              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (testLine.length <= maxCharsPerLine) {
                  currentLine = testLine;
                } else {
                  if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                  }
                  if (lines.length >= maxLines) break;
                }
              }

              if (currentLine && lines.length < maxLines) {
                lines.push(currentLine);
              }

              // If text was truncated, add ellipsis to last line
              if (words.join(' ').length > lines.join(' ').length) {
                const lastLine = lines[lines.length - 1];
                if (lastLine && lastLine.length > maxCharsPerLine - 3) {
                  lines[lines.length - 1] = lastLine.substring(0, maxCharsPerLine - 3) + '...';
                } else if (lastLine) {
                  lines[lines.length - 1] = lastLine + '...';
                }
              }

              return (
                <g key={index}>
                  <circle cx="75" cy={335 + (index * 35)} r="2" fill={index < 2 ? theme.primaryColor : theme.accentColor} />
                  {lines.map((line, lineIndex) => (
                    <text key={lineIndex} x="85" y={340 + (index * 35) + (lineIndex * 14)} className="prescription-text">
                      {line}
                    </text>
                  ))}
                </g>
              );
            });
          })()}
          
          {/* Confidence Score - Moved after Synopsis */}
          <rect
            x={size - 180}
            y="475"
            width="140"
            height={data.enhancedData?.agentConsensus ? "75" : "60"}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth="1"
            rx="5"
          />
          <text x={size - 110} y="495" textAnchor="middle" className="prescription-small">
            AI CONFIDENCE
          </text>
          <text x={size - 110} y="515" textAnchor="middle" className="prescription-header">
            {Math.round(data.confidence * 100)}%
          </text>
          {data.enhancedData?.agentConsensus && (
            <text x={size - 110} y="535" textAnchor="middle" className="prescription-small" fill={theme.primaryColor}>
              Agent Consensus: {Math.round(data.enhancedData.agentConsensus * 100)}%
            </text>
          )}
          {data.enhancedData?.evidenceGrade && !data.enhancedData?.agentConsensus && (
            <text x={size - 110} y="535" textAnchor="middle" className="prescription-small" fill={theme.primaryColor}>
              Evidence: Grade {data.enhancedData.evidenceGrade}
            </text>
          )}
          
          {/* Rarity Badge - Moved to avoid overlap */}
          <rect
            x={size - 180}
            y={data.enhancedData?.agentConsensus ? "555" : "540"}
            width="140"
            height="20"
            fill={theme.primaryColor + "20"}
            stroke={theme.primaryColor}
            strokeWidth="1"
            rx="10"
          />
          <text x={size - 110} y={data.enhancedData?.agentConsensus ? "570" : "555"} textAnchor="middle" className="prescription-small" fill={theme.primaryColor}>
            {prescriptionMetadata.rarity === 'ultra-rare' && '✨'}
            {prescriptionMetadata.rarity === 'rare' && '⭐'}
            {prescriptionMetadata.rarity === 'uncommon' && '💫'}
            {prescriptionMetadata.rarity === 'common' && '🔹'}
            {' '}{prescriptionMetadata.rarity.toUpperCase().replace('-', ' ')}
          </text>

          {/* MD Review Stamp */}
          {mdReviewed && (
            <g>
              <circle 
                cx={size - 80} 
                cy="460" 
                r="35" 
                fill="rgba(16,185,129,0.1)" 
                stroke="#10b981" 
                strokeWidth="2" 
              />
              <text x={size - 80} y="455" textAnchor="middle" className="prescription-small" fill="#10b981" fontWeight="bold">
                MD
              </text>
              <text x={size - 80} y="470" textAnchor="middle" className="prescription-small" fill="#10b981" fontWeight="bold">
                REVIEWED
              </text>
            </g>
          )}
          
          {/* Footer Section */}
          <line x1="40" y1={size * 1.4 - 200} x2={size - 40} y2={size * 1.4 - 200} stroke="#e5e7eb" strokeWidth="1" />
          
          {/* QR Code - Inline SVG */}
          <g transform={`translate(60, ${size * 1.4 - 180})`}>
            <rect x="0" y="0" width="60" height="60" fill="white" stroke="#374151" strokeWidth="1" rx="3"/>
            <rect x="5" y="5" width="8" height="8" fill="#374151"/>
            <rect x="5" y="47" width="8" height="8" fill="#374151"/>
            <rect x="47" y="5" width="8" height="8" fill="#374151"/>
            <rect x="15" y="15" width="3" height="3" fill="#374151"/>
            <rect x="21" y="15" width="3" height="3" fill="#374151"/>
            <rect x="27" y="15" width="3" height="3" fill="#374151"/>
            <rect x="33" y="15" width="3" height="3" fill="#374151"/>
            <rect x="39" y="15" width="3" height="3" fill="#374151"/>
            <rect x="15" y="21" width="3" height="3" fill="#374151"/>
            <rect x="27" y="21" width="3" height="3" fill="#374151"/>
            <rect x="39" y="21" width="3" height="3" fill="#374151"/>
            <rect x="15" y="27" width="3" height="3" fill="#374151"/>
            <rect x="21" y="27" width="3" height="3" fill="#374151"/>
            <rect x="33" y="27" width="3" height="3" fill="#374151"/>
            <rect x="45" y="27" width="3" height="3" fill="#374151"/>
            <rect x="15" y="33" width="3" height="3" fill="#374151"/>
            <rect x="27" y="33" width="3" height="3" fill="#374151"/>
            <rect x="39" y="33" width="3" height="3" fill="#374151"/>
            <rect x="21" y="39" width="3" height="3" fill="#374151"/>
            <rect x="33" y="39" width="3" height="3" fill="#374151"/>
            <rect x="45" y="39" width="3" height="3" fill="#374151"/>
            <rect x="15" y="45" width="3" height="3" fill="#374151"/>
            <rect x="27" y="45" width="3" height="3" fill="#374151"/>
            <rect x="33" y="45" width="3" height="3" fill="#374151"/>
            <rect x="39" y="45" width="3" height="3" fill="#374151"/>
          </g>
          
          {/* Verification Info - Centered alignment */}
          <text x={size / 2} y={size * 1.4 - 170} textAnchor="middle" className="prescription-small">
            Verification Code: {prescriptionMetadata.verificationHash}
          </text>
          <text x={size / 2} y={size * 1.4 - 155} textAnchor="middle" className="prescription-small">
            Generated by OrthoIQ Claude AI System
          </text>
          <text x={size / 2} y={size * 1.4 - 140} textAnchor="middle" className="prescription-small">
            Reviewed under Board Certified MD supervision
          </text>
          
          {/* Logo Seal - OrthoIQ Component - Moved inward from border and aligned with QR code */}
          <foreignObject x={size - 120} y={size * 1.4 - 180} width="80" height="80">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '100%', 
              height: '100%',
              background: 'white',
              borderRadius: '50%',
              border: '2px solid #e5e7eb',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
              <OrthoIQLogo size={60} variant={theme.primaryColor === '#3b82f6' ? 'blue' : theme.primaryColor === '#0891b2' ? 'teal' : 'blue'} />
            </div>
          </foreignObject>
          
          {/* Medical Disclaimers - Centered */}
          <text x={size / 2} y={size * 1.4 - 110} textAnchor="middle" className="prescription-small">
            ⚠️ MEDICAL DISCLAIMER: This AI provides educational information only.
          </text>
          <text x={size / 2} y={size * 1.4 - 95} textAnchor="middle" className="prescription-small">
            Always consult with a qualified healthcare provider for medical concerns.
          </text>
          <text x={size / 2} y={size * 1.4 - 80} textAnchor="middle" className="prescription-small">
            Not intended to replace professional medical advice, diagnosis, or treatment.
          </text>
          
          {/* Prescription Number Footer */}
          <text x={size / 2} y={size * 1.4 - 50} textAnchor="middle" className="prescription-small">
            OrthoIQ Prescription #{prescriptionMetadata.id} • Generated {formatDate(data.timestamp)}
          </text>
        </svg>
      </div>
    </div>
  );
}