'use client';

import { useMemo, useRef } from 'react';
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
    
    if (onGenerated) {
      onGenerated(metadata);
    }
    
    return metadata;
  }, [data, onGenerated]);

  const parsedResponse = useMemo(() => {
    return parseClaudeResponse(data.claudeResponse);
  }, [data.claudeResponse]);

  const theme = prescriptionMetadata.theme;
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRarityBadge = () => {
    const rarityColors = {
      'common': 'bg-blue-100 text-blue-800 border-blue-200',
      'uncommon': 'bg-teal-100 text-teal-800 border-teal-200',
      'rare': 'bg-amber-100 text-amber-800 border-amber-200',
      'ultra-rare': 'bg-purple-100 text-purple-800 border-purple-200'
    };

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${rarityColors[prescriptionMetadata.rarity]}`}>
        <span className="mr-1">
          {prescriptionMetadata.rarity === 'ultra-rare' && '✨'}
          {prescriptionMetadata.rarity === 'rare' && '⭐'}
          {prescriptionMetadata.rarity === 'uncommon' && '💫'}
          {prescriptionMetadata.rarity === 'common' && '🔹'}
        </span>
        {prescriptionMetadata.rarity.toUpperCase().replace('-', ' ')}
      </div>
    );
  };

  const generateQRCode = () => {
    // Simple QR code placeholder - in production, use a proper QR code library
    return (
      <svg width="60" height="60" viewBox="0 0 21 21" fill="none">
        <rect x="0" y="0" width="21" height="21" fill="white" stroke="#374151" strokeWidth="0.5"/>
        <rect x="1" y="1" width="3" height="3" fill="#374151"/>
        <rect x="1" y="17" width="3" height="3" fill="#374151"/>
        <rect x="17" y="1" width="3" height="3" fill="#374151"/>
        <rect x="5" y="5" width="1" height="1" fill="#374151"/>
        <rect x="7" y="5" width="1" height="1" fill="#374151"/>
        <rect x="9" y="5" width="1" height="1" fill="#374151"/>
        <rect x="11" y="5" width="1" height="1" fill="#374151"/>
        <rect x="13" y="5" width="1" height="1" fill="#374151"/>
        <rect x="15" y="5" width="1" height="1" fill="#374151"/>
        <rect x="5" y="7" width="1" height="1" fill="#374151"/>
        <rect x="9" y="7" width="1" height="1" fill="#374151"/>
        <rect x="13" y="7" width="1" height="1" fill="#374151"/>
        <rect x="5" y="9" width="1" height="1" fill="#374151"/>
        <rect x="7" y="9" width="1" height="1" fill="#374151"/>
        <rect x="11" y="9" width="1" height="1" fill="#374151"/>
        <rect x="15" y="9" width="1" height="1" fill="#374151"/>
        <rect x="5" y="11" width="1" height="1" fill="#374151"/>
        <rect x="9" y="11" width="1" height="1" fill="#374151"/>
        <rect x="13" y="11" width="1" height="1" fill="#374151"/>
        <rect x="7" y="13" width="1" height="1" fill="#374151"/>
        <rect x="11" y="13" width="1" height="1" fill="#374151"/>
        <rect x="15" y="13" width="1" height="1" fill="#374151"/>
        <rect x="5" y="15" width="1" height="1" fill="#374151"/>
        <rect x="9" y="15" width="1" height="1" fill="#374151"/>
        <rect x="11" y="15" width="1" height="1" fill="#374151"/>
        <rect x="13" y="15" width="1" height="1" fill="#374151"/>
      </svg>
    );
  };

  return (
    <div className={`prescription-container ${className}`}>
      <div className={`bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto ${theme.effects.join(' ')}`}>
        {/* Rarity Effects */}
        {prescriptionMetadata.rarity === 'ultra-rare' && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-indigo-400/20 rounded-lg animate-gradient-x"></div>
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
            
            {/* Rare prescription effects */}
            {prescriptionMetadata.rarity === 'rare' && (
              <linearGradient id="gold-shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(245,158,11,0.1)" />
                <stop offset="50%" stopColor="rgba(245,158,11,0.3)" />
                <stop offset="100%" stopColor="rgba(245,158,11,0.1)" />
                <animateTransform 
                  attributeName="gradientTransform" 
                  attributeType="XML" 
                  values="-200 0;800 0;-200 0" 
                  dur="3s" 
                  repeatCount="indefinite"
                  type="translate" 
                />
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
          
          {/* Logo */}
          <foreignObject x={size - 100} y="30" width="60" height="60">
            <OrthoIQLogo size={60} variant={theme.logoVariant} circular />
          </foreignObject>
          
          {/* Patient Information Section */}
          <line x1="40" y1="130" x2={size - 40} y2="130" stroke="#e5e7eb" strokeWidth="1" />
          
          <text x="40" y="155" className="prescription-header">PATIENT INFORMATION</text>
          
          <text x="60" y="175" className="prescription-text">
            Name: Anonymous User
          </text>
          <text x="60" y="195" className="prescription-text">
            ID: #{data.fid}
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
          
          <text x="120" y="255" className="prescription-header">CHIEF COMPLAINT</text>
          <text x="120" y="275" className="prescription-text">
            {parsedResponse.chiefComplaint}
          </text>
          
          {/* Assessment */}
          <text x="60" y="315" className="prescription-header">ASSESSMENT</text>
          {parsedResponse.assessment.slice(0, 3).map((item, index) => (
            <g key={index}>
              <circle cx="75" cy={335 + (index * 25)} r="2" fill={theme.primaryColor} />
              <text x="85" y={340 + (index * 25)} className="prescription-text">
                {item.length > 70 ? item.substring(0, 70) + '...' : item}
              </text>
            </g>
          ))}
          
          {/* Recommendations */}
          <text x="60" y={425 + (Math.min(parsedResponse.assessment.length, 3) * 25)} className="prescription-header">
            RECOMMENDATIONS
          </text>
          {parsedResponse.recommendations.slice(0, 3).map((item, index) => (
            <g key={index}>
              <circle cx="75" cy={445 + (Math.min(parsedResponse.assessment.length, 3) * 25) + (index * 25)} r="2" fill={theme.accentColor} />
              <text x="85" y={450 + (Math.min(parsedResponse.assessment.length, 3) * 25) + (index * 25)} className="prescription-text">
                {item.length > 70 ? item.substring(0, 70) + '...' : item}
              </text>
            </g>
          ))}
          
          {/* Confidence Score */}
          <rect 
            x={size - 180} 
            y="300" 
            width="140" 
            height="80" 
            fill="#f8fafc" 
            stroke="#e2e8f0" 
            strokeWidth="1" 
            rx="5" 
          />
          <text x={size - 110} y="320" textAnchor="middle" className="prescription-small">
            AI CONFIDENCE
          </text>
          <text x={size - 110} y="340" textAnchor="middle" className="prescription-header">
            {Math.round(data.confidence * 100)}%
          </text>
          <foreignObject x={size - 140} y="350" width="80" height="30">
            {getRarityBadge()}
          </foreignObject>
          
          {/* Footer Section */}
          <line x1="40" y1={size * 1.4 - 200} x2={size - 40} y2={size * 1.4 - 200} stroke="#e5e7eb" strokeWidth="1" />
          
          {/* QR Code */}
          <foreignObject x="60" y={size * 1.4 - 180} width="60" height="60">
            {generateQRCode()}
          </foreignObject>
          
          {/* Verification Info */}
          <text x="140" y={size * 1.4 - 170} className="prescription-small">
            Verification Code: {prescriptionMetadata.verificationHash}
          </text>
          <text x="140" y={size * 1.4 - 155} className="prescription-small">
            Generated by OrthoIQ Claude AI System
          </text>
          <text x="140" y={size * 1.4 - 140} className="prescription-small">
            Reviewed under Board Certified MD supervision
          </text>
          
          {/* Logo Seal */}
          <foreignObject x={size - 120} y={size * 1.4 - 180} width="80" height="80">
            <div className="flex items-center justify-center w-full h-full">
              <div className="bg-white rounded-full p-2 border-2 border-gray-200">
                <OrthoIQLogo size={50} variant={theme.logoVariant} circular />
              </div>
            </div>
          </foreignObject>
          
          {/* Medical Disclaimers */}
          <text x="60" y={size * 1.4 - 110} className="prescription-small">
            ⚠️ MEDICAL DISCLAIMER: This AI provides educational information only.
          </text>
          <text x="60" y={size * 1.4 - 95} className="prescription-small">
            Always consult with a qualified healthcare provider for medical concerns.
          </text>
          <text x="60" y={size * 1.4 - 80} className="prescription-small">
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