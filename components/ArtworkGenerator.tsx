import { ArtworkConfig } from '@/lib/types';
import { medicalAnalyzer, MedicalAnalysis } from '@/lib/medicalAnalyzer';
import { colorPaletteGenerator, ColorPalette } from '@/lib/colorPalettes';
import { artworkSeedGenerator, ArtworkSeed } from '@/lib/artworkSeeds';
import { visualGenerator, LayeredComposition, SVGElement } from '@/lib/visualGenerator';
import { useMemo } from 'react';

interface ArtworkGeneratorProps {
  theme?: ArtworkConfig['theme']; // Now optional, can be derived from question
  size?: number;
  className?: string;
  question?: string; // New prop for question-driven generation
  analysis?: MedicalAnalysis; // Optional pre-computed analysis
  seed?: string; // Optional seed for reproducibility
}

export default function ArtworkGenerator({ 
  theme, 
  size = 200, 
  className = "",
  question,
  analysis,
  seed
}: ArtworkGeneratorProps) {
  
  // Generate or use provided analysis
  const medicalAnalysis = useMemo(() => {
    if (analysis) return analysis;
    if (question) return medicalAnalyzer.analyze(question);
    
    // Fallback: create minimal analysis from theme
    const fallbackTheme = theme || 'general';
    return {
      bodyParts: [],
      conditions: [],
      treatmentContext: 'general' as const,
      emotionalTone: 'neutral' as const,
      subspecialty: 'general' as const,
      complexityLevel: 3,
      questionLength: 0,
      medicalTermCount: 0,
      timeContext: 'none' as const
    };
  }, [question, analysis, theme]);

  // Generate artwork elements using the new system
  const artworkData = useMemo(() => {
    const questionText = question || `${theme || 'general'} medical artwork`;
    const artworkSeed = artworkSeedGenerator.generateSeed(questionText + (seed || ''), medicalAnalysis);
    const palette = colorPaletteGenerator.generatePalette(medicalAnalysis);
    const composition = visualGenerator.generateComposition(medicalAnalysis, palette, artworkSeed, size);
    
    return { seed: artworkSeed, palette, composition };
  }, [question, medicalAnalysis, seed, size, theme]);

  // Fallback theme config for backward compatibility
  const getThemeConfig = (theme: ArtworkConfig['theme']): ArtworkConfig => {
    switch (theme) {
      case 'bone':
        return {
          theme: 'bone',
          colors: ['#f4f4f4', '#e8e8e8', '#d4d4d4'],
          elements: ['bone', 'joint', 'marrow']
        };
      case 'muscle':
        return {
          theme: 'muscle',
          colors: ['#d32f2f', '#f44336', '#ffcdd2'],
          elements: ['fiber', 'tendon', 'tissue']
        };
      case 'joint':
        return {
          theme: 'joint',
          colors: ['#1976d2', '#2196f3', '#bbdefb'],
          elements: ['cartilage', 'synovial', 'ligament']
        };
      default:
        return {
          theme: 'general',
          colors: ['#2c3e50', '#3498db', '#ecf0f1'],
          elements: ['medical', 'health', 'care']
        };
    }
  };

  // Always use professional medical system (no more abstract art)
  const useNewSystem = true;
  const config = null;

  // Helper function to render SVG elements
  const renderSVGElement = (element: SVGElement, index: number) => {
    const { type, attributes, className: elementClassName } = element;
    const props = {
      key: index,
      ...attributes,
      className: elementClassName
    };
    
    switch (type) {
      case 'circle':
        return <circle {...props} />;
      case 'ellipse':
        return <ellipse {...props} />;
      case 'rect':
        return <rect {...props} />;
      case 'path':
        return <path {...props} />;
      case 'line':
        return <line {...props} />;
      case 'polygon':
        return <polygon {...props} />;
      default:
        return null;
    }
  };

  // Generate medical visuals based on question content
  const generateMedicalVisual = () => {
    const questionText = (question || '').toLowerCase();
    
    // Determine body part/condition from question
    const isKnee = questionText.includes('knee') || questionText.includes('patella');
    const isShoulder = questionText.includes('shoulder') || questionText.includes('rotator');
    const isBack = questionText.includes('back') || questionText.includes('spine') || questionText.includes('vertebra');
    const isAnkle = questionText.includes('ankle') || questionText.includes('foot');
    const isElbow = questionText.includes('elbow');
    const isWrist = questionText.includes('wrist') || questionText.includes('carpal');
    const isHip = questionText.includes('hip');
    
    // Determine condition type
    const isPain = questionText.includes('pain') || questionText.includes('hurt') || questionText.includes('ache');
    const isInjury = questionText.includes('injury') || questionText.includes('injured');
    const isFracture = questionText.includes('fracture') || questionText.includes('break') || questionText.includes('broken');
    const isStrain = questionText.includes('strain') || questionText.includes('pull');
    const isSwelling = questionText.includes('swell') || questionText.includes('inflammation');

    if (isKnee) return 'knee';
    if (isShoulder) return 'shoulder';
    if (isBack) return 'spine';
    if (isAnkle) return 'ankle';
    if (isElbow) return 'elbow';
    if (isWrist) return 'wrist';
    if (isHip) return 'hip';
    if (isFracture) return 'bone';
    if (isStrain) return 'muscle';
    return 'general';
  };

  const medicalType = generateMedicalVisual();

  return (
    <div className={`inline-block ${className}`}>
      <svg 
        id="ortho-artwork"
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-md border border-gray-200 rounded-lg bg-white"
      >
        <defs>
          <linearGradient id="medical-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="pain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef2f2" />
            <stop offset="100%" stopColor="#fee2e2" />
          </linearGradient>
        </defs>
        
        {/* Background */}
        <rect width={size} height={size} fill="url(#medical-gradient)" />
        
        {/* Medical Visual Content */}
        {medicalType === 'knee' && (
          <g>
            {/* Femur */}
            <rect x={size*0.45} y={size*0.1} width={size*0.1} height={size*0.35} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" rx={size*0.05} />
            {/* Tibia */}
            <rect x={size*0.45} y={size*0.55} width={size*0.1} height={size*0.35} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" rx={size*0.05} />
            {/* Patella (kneecap) */}
            <circle cx={size*0.5} cy={size*0.45} r={size*0.08} fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
            {/* Joint space */}
            <ellipse cx={size*0.5} cy={size*0.45} rx={size*0.12} ry={size*0.06} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,2" />
            {/* Labels */}
            <text x={size*0.65} y={size*0.25} fontSize={size*0.06} fill="#475569" fontFamily="Arial">Femur</text>
            <text x={size*0.65} y={size*0.45} fontSize={size*0.06} fill="#475569" fontFamily="Arial">Patella</text>
            <text x={size*0.65} y={size*0.65} fontSize={size*0.06} fill="#475569" fontFamily="Arial">Tibia</text>
          </g>
        )}
        
        {medicalType === 'shoulder' && (
          <g>
            {/* Humerus */}
            <rect x={size*0.4} y={size*0.45} width={size*0.35} height={size*0.08} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" rx={size*0.04} />
            {/* Scapula */}
            <path d={`M${size*0.25} ${size*0.35} Q${size*0.4} ${size*0.25} ${size*0.45} ${size*0.45} L${size*0.25} ${size*0.55} Z`} fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
            {/* Shoulder joint */}
            <circle cx={size*0.42} cy={size*0.49} r={size*0.06} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,2" />
            {/* Rotator cuff indicator */}
            <path d={`M${size*0.35} ${size*0.42} Q${size*0.42} ${size*0.38} ${size*0.49} ${size*0.42}`} fill="none" stroke="#ef4444" strokeWidth="2" />
            {/* Labels */}
            <text x={size*0.55} y={size*0.35} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Scapula</text>
            <text x={size*0.55} y={size*0.55} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Humerus</text>
          </g>
        )}
        
        {medicalType === 'spine' && (
          <g>
            {/* Vertebrae */}
            {[0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((y, index) => (
              <ellipse key={index} cx={size*0.5} cy={size*y} rx={size*0.08} ry={size*0.04} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            ))}
            {/* Spinal curve */}
            <path d={`M${size*0.5} ${size*0.15} Q${size*0.45} ${size*0.35} ${size*0.5} ${size*0.55} Q${size*0.55} ${size*0.75} ${size*0.5} ${size*0.85}`} 
                  fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,2" />
            {/* Disc spaces */}
            {[0.25, 0.35, 0.45, 0.55, 0.65].map((y, index) => (
              <ellipse key={index} cx={size*0.5} cy={size*y} rx={size*0.06} ry={size*0.015} fill="#fbbf24" />
            ))}
            {/* Labels */}
            <text x={size*0.65} y={size*0.3} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Cervical</text>
            <text x={size*0.65} y={size*0.5} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Thoracic</text>
            <text x={size*0.65} y={size*0.7} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Lumbar</text>
          </g>
        )}
        
        {medicalType === 'bone' && (
          <g>
            {/* Long bone structure */}
            <rect x={size*0.4} y={size*0.15} width={size*0.2} height={size*0.7} fill="#f1f5f9" stroke="#64748b" strokeWidth="2" rx={size*0.1} />
            {/* Bone marrow cavity */}
            <rect x={size*0.42} y={size*0.2} width={size*0.16} height={size*0.6} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" rx={size*0.08} />
            {/* Fracture line */}
            <path d={`M${size*0.35} ${size*0.5} L${size*0.65} ${size*0.52}`} stroke="#dc2626" strokeWidth="3" />
            <path d={`M${size*0.37} ${size*0.48} L${size*0.63} ${size*0.54}`} stroke="#dc2626" strokeWidth="2" />
            {/* Bone ends */}
            <ellipse cx={size*0.5} cy={size*0.15} rx={size*0.12} ry={size*0.06} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
            <ellipse cx={size*0.5} cy={size*0.85} rx={size*0.12} ry={size*0.06} fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
            {/* Labels */}
            <text x={size*0.65} y={size*0.3} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Cortical</text>
            <text x={size*0.65} y={size*0.45} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Bone</text>
            <text x={size*0.65} y={size*0.65} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Marrow</text>
          </g>
        )}
        
        {medicalType === 'muscle' && (
          <g>
            {/* Muscle fibers */}
            {[0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65].map((x, index) => (
              <path key={index} 
                    d={`M${size*x} ${size*0.2} Q${size*(x+0.02)} ${size*0.5} ${size*x} ${size*0.8}`} 
                    fill="none" stroke="#dc2626" strokeWidth="3" />
            ))}
            {/* Muscle outline */}
            <ellipse cx={size*0.5} cy={size*0.5} rx={size*0.2} ry={size*0.3} fill="none" stroke="#991b1b" strokeWidth="2" />
            {/* Strain/tear indicator */}
            <path d={`M${size*0.4} ${size*0.45} L${size*0.6} ${size*0.55}`} stroke="#fbbf24" strokeWidth="3" strokeDasharray="5,3" />
            {/* Labels */}
            <text x={size*0.65} y={size*0.35} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Muscle</text>
            <text x={size*0.65} y={size*0.5} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Fibers</text>
            <text x={size*0.65} y={size*0.65} fontSize={size*0.05} fill="#475569" fontFamily="Arial">Strain</text>
          </g>
        )}
        
        {medicalType === 'general' && (
          <g>
            {/* Medical cross */}
            <rect x={size*0.45} y={size*0.25} width={size*0.1} height={size*0.5} fill="#3b82f6" />
            <rect x={size*0.25} y={size*0.45} width={size*0.5} height={size*0.1} fill="#3b82f6" />
            {/* Stethoscope-like curve */}
            <path d={`M${size*0.2} ${size*0.75} Q${size*0.35} ${size*0.65} ${size*0.5} ${size*0.75} Q${size*0.65} ${size*0.85} ${size*0.8} ${size*0.75}`} 
                  fill="none" stroke="#10b981" strokeWidth="3" />
            <circle cx={size*0.2} cy={size*0.75} r={size*0.04} fill="#10b981" />
            <circle cx={size*0.8} cy={size*0.75} r={size*0.04} fill="#10b981" />
            {/* Labels */}
            <text x={size*0.15} y={size*0.95} fontSize={size*0.06} fill="#475569" fontFamily="Arial" textAnchor="middle">OrthoIQ</text>
          </g>
        )}
        
        {/* Pain indicator for all types if pain-related */}
        {question && (question.toLowerCase().includes('pain') || question.toLowerCase().includes('hurt')) && (
          <g>
            <circle cx={size*0.85} cy={size*0.15} r={size*0.08} fill="#fef2f2" stroke="#dc2626" strokeWidth="2" />
            <text x={size*0.85} y={size*0.18} fontSize={size*0.04} fill="#dc2626" fontFamily="Arial" textAnchor="middle" fontWeight="bold">!</text>
          </g>
        )}
        
        {/* Medical disclaimer icon */}
        <circle cx={size*0.15} cy={size*0.15} r={size*0.08} fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
        <text x={size*0.15} y={size*0.18} fontSize={size*0.05} fill="#64748b" fontFamily="Arial" textAnchor="middle" fontWeight="bold">i</text>
      </svg>
    </div>
  );
}

// Export the medical analysis hook for external use
export const useMedicalArtwork = (question: string) => {
  return useMemo(() => {
    if (!question) return null;
    
    const analysis = medicalAnalyzer.analyze(question);
    const seed = artworkSeedGenerator.generateSeed(question, analysis);
    const palette = colorPaletteGenerator.generatePalette(analysis);
    
    return { analysis, seed, palette };
  }, [question]);
};