'use client';

import React, { useMemo, useRef } from 'react';
import OrthoIQLogo from './OrthoIQLogo';
import { PrescriptionData, PrescriptionMetadata } from '@/lib/types';
import { 
  parseClaudeResponse, 
  calculateRarity, 
  calculateQuestionComplexity,
  generateMetadata 
} from '@/lib/prescriptionUtils';

interface PrescriptionGeneratorProps {
  data: PrescriptionData;
  size?: number;
  className?: string;
  onGenerated?: (metadata: PrescriptionMetadata) => void;
}

export default function PrescriptionGenerator({ 
  data, 
  size = 600, 
  className = "",
  onGenerated 
}: PrescriptionGeneratorProps) {
  const prescriptionRef = useRef<SVGSVGElement>(null);

  const prescriptionMetadata = useMemo(() => {
    const complexity = calculateQuestionComplexity(data.userQuestion);
    const rarity = calculateRarity(data.confidence, complexity);
    const metadata = generateMetadata(data, rarity);
    return metadata;
  }, [data]);

  // Separate effect to avoid re-renders
  React.useEffect(() => {
    if (onGenerated && prescriptionMetadata) {
      onGenerated(prescriptionMetadata);
    }
  }, [onGenerated, prescriptionMetadata]);

  const parsedResponse = useMemo(() => {
    return parseClaudeResponse(data.claudeResponse, { 
      inquiry: data.inquiry, 
      keyPoints: data.keyPoints 
    });
  }, [data.claudeResponse, data.inquiry, data.keyPoints]);

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
            
            {/* Rare prescription effects - Static */}
            {prescriptionMetadata.rarity === 'rare' && (
              <linearGradient id="gold-shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(245,158,11,0.1)" />
                <stop offset="50%" stopColor="rgba(245,158,11,0.2)" />
                <stop offset="100%" stopColor="rgba(245,158,11,0.1)" />
              </linearGradient>
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
          
          {/* Rare effects overlay */}
          {prescriptionMetadata.rarity === 'rare' && (
            <rect 
              x="20" 
              y="20" 
              width={size - 40} 
              height={size * 1.4 - 40} 
              fill="url(#gold-shimmer)" 
              rx="10" 
            />
          )}
          
          {/* Header */}
          <text x={size / 2} y="60" textAnchor="middle" className="prescription-title">
            OrthoIQ Medical Intelligence
          </text>
          
          <text x={size / 2} y="85" textAnchor="middle" className="prescription-subtitle">
            Board Certified MD Supervised
          </text>
          
          <text x={size / 2} y="105" textAnchor="middle" className="prescription-small">
            Orthopedic Surgery / Sports Medicine
          </text>
          
          {/* Logo - Pure SVG version with better visibility */}
          <g transform={`translate(${size - 90}, 40)`}>
            {/* Subtle shadow for depth */}
            <circle cx="31" cy="31" r="28" fill="rgba(0,0,0,0.1)" />
            <circle cx="30" cy="30" r="28" fill={theme.primaryColor} />
            <circle cx="30" cy="30" r="20" fill="white" />
            {/* Change diagonal line to use theme color instead of white */}
            <line x1="15" y1="15" x2="45" y2="45" stroke={theme.primaryColor} strokeWidth="3" opacity="0.7" />
          </g>
          
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
          
          <text x="120" y="255" className="prescription-header">CHIEF INQUIRY</text>
          <text x="120" y="275" className="prescription-text">
            {parsedResponse.chiefComplaint}
          </text>
          
          {/* Synopsis - Combined Assessment and Recommendations */}
          <text x="60" y="315" className="prescription-header">SYNOPSIS</text>
          {[...parsedResponse.assessment.slice(0, 2), ...parsedResponse.recommendations.slice(0, 2)].map((item, index) => (
            <g key={index}>
              <circle cx="75" cy={335 + (index * 25)} r="2" fill={index < 2 ? theme.primaryColor : theme.accentColor} />
              <text x="85" y={340 + (index * 25)} className="prescription-text">
                {item.length > 70 ? item.substring(0, 70) + '...' : item}
              </text>
            </g>
          ))}
          
          {/* Confidence Score - Moved after Synopsis */}
          <rect 
            x={size - 180} 
            y="435" 
            width="140" 
            height="60" 
            fill="#f8fafc" 
            stroke="#e2e8f0" 
            strokeWidth="1" 
            rx="5" 
          />
          <text x={size - 110} y="455" textAnchor="middle" className="prescription-small">
            AI CONFIDENCE
          </text>
          <text x={size - 110} y="475" textAnchor="middle" className="prescription-header">
            {Math.round(data.confidence * 100)}%
          </text>
          {/* Rarity Badge - Pure SVG version */}
          <rect 
            x={size - 140} 
            y="485" 
            width="80" 
            height="20" 
            fill={theme.primaryColor + "20"} 
            stroke={theme.primaryColor} 
            strokeWidth="1" 
            rx="10" 
          />
          <text x={size - 100} y="500" textAnchor="middle" className="prescription-small" fill={theme.primaryColor}>
            {prescriptionMetadata.rarity === 'ultra-rare' && '✨'}
            {prescriptionMetadata.rarity === 'rare' && '⭐'}
            {prescriptionMetadata.rarity === 'uncommon' && '💫'}
            {prescriptionMetadata.rarity === 'common' && '🔹'}
            {' '}{prescriptionMetadata.rarity.toUpperCase().replace('-', ' ')}
          </text>
          
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
          
          {/* Logo Seal - Pure SVG version with better visibility */}
          <g transform={`translate(${size - 100}, ${size * 1.4 - 160})`}>
            {/* Subtle shadow for depth */}
            <circle cx="41" cy="41" r="38" fill="rgba(0,0,0,0.1)" />
            <circle cx="40" cy="40" r="38" fill="white" stroke="#e5e7eb" strokeWidth="2" />
            <circle cx="40" cy="40" r="30" fill={theme.primaryColor} />
            <circle cx="40" cy="40" r="22" fill="white" />
            {/* Change diagonal line to use theme color for visibility */}
            <line x1="25" y1="25" x2="55" y2="55" stroke={theme.primaryColor} strokeWidth="2" opacity="0.7" />
          </g>
          
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