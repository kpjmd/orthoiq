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

  // Use new system if question provided, otherwise fallback to theme
  const useNewSystem = Boolean(question || analysis);
  const config = useNewSystem ? null : getThemeConfig(theme || 'general');

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

  return (
    <div className={`inline-block ${className}`}>
      <svg 
        id="ortho-artwork"
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-md"
      >
        {useNewSystem ? (
          // New question-driven artwork generation
          <>
            <defs>
              <radialGradient id={`gradient-${artworkData.seed.hash.substring(0, 6)}`} cx="50%" cy="50%" r="50%">
                {artworkData.palette.gradientStops.map((color, index) => (
                  <stop 
                    key={index} 
                    offset={`${(index / (artworkData.palette.gradientStops.length - 1)) * 100}%`} 
                    stopColor={color} 
                  />
                ))}
              </radialGradient>
            </defs>
            
            {/* Render layered composition */}
            <g className="background-layer">
              {artworkData.composition.background.map(renderSVGElement)}
            </g>
            
            <g className="structural-layer">
              {artworkData.composition.structural.map(renderSVGElement)}
            </g>
            
            <g className="detail-layer">
              {artworkData.composition.detail.map(renderSVGElement)}
            </g>
            
            <g className="overlay-layer">
              {artworkData.composition.overlay.map(renderSVGElement)}
            </g>
          </>
        ) : (
          // Fallback to original theme-based system
          <>
            <defs>
              <radialGradient id={`gradient-${theme || 'general'}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={config!.colors[0]} />
                <stop offset="50%" stopColor={config!.colors[1]} />
                <stop offset="100%" stopColor={config!.colors[2]} />
              </radialGradient>
            </defs>
            
            <rect width={size} height={size} fill={`url(#gradient-${theme || 'general'})`} rx={size * 0.1} />
            
            {/* Theme-specific artwork */}
            {theme === 'bone' && (
              <g>
                <ellipse cx={size/2} cy={size*0.25} rx={size*0.075} ry={size*0.125} fill="#f8f8f8" />
                <rect x={size*0.425} y={size*0.25} width={size*0.15} height={size*0.5} fill="#f0f0f0" />
                <ellipse cx={size/2} cy={size*0.75} rx={size*0.075} ry={size*0.125} fill="#f8f8f8" />
                <circle cx={size/2} cy={size/2} r={size*0.04} fill="#e0e0e0" />
              </g>
            )}
            
            {theme === 'muscle' && (
              <g>
                <path d={`M${size*0.25} ${size*0.25} Q${size/2} ${size*0.4} ${size*0.75} ${size*0.25} Q${size/2} ${size*0.6} ${size*0.25} ${size*0.75} Q${size/2} ${size*0.6} ${size*0.75} ${size*0.75}`} 
                      fill="none" stroke="#d32f2f" strokeWidth={size*0.03} />
                <path d={`M${size*0.3} ${size*0.3} Q${size/2} ${size*0.45} ${size*0.7} ${size*0.3} Q${size/2} ${size*0.65} ${size*0.3} ${size*0.8}`} 
                      fill="none" stroke="#f44336" strokeWidth={size*0.02} />
                <path d={`M${size*0.35} ${size*0.35} Q${size/2} ${size/2} ${size*0.65} ${size*0.35} Q${size/2} ${size*0.7} ${size*0.35} ${size*0.85}`} 
                      fill="none" stroke="#ff6b6b" strokeWidth={size*0.015} />
              </g>
            )}
            
            {theme === 'joint' && (
              <g>
                <circle cx={size/2} cy={size/2} r={size*0.2} fill="none" stroke="#1976d2" strokeWidth={size*0.02} />
                <circle cx={size/2} cy={size/2} r={size*0.125} fill="#bbdefb" opacity="0.7" />
                <path d={`M${size*0.35} ${size/2} Q${size/2} ${size*0.35} ${size*0.65} ${size/2} Q${size/2} ${size*0.65} ${size*0.35} ${size/2}`} fill="#2196f3" opacity="0.8" />
                <circle cx={size/2} cy={size/2} r={size*0.04} fill="#0d47a1" />
              </g>
            )}
            
            {(theme === 'general' || !theme) && (
              <g>
                <rect x={size*0.425} y={size*0.3} width={size*0.15} height={size*0.4} fill="#2c3e50" rx={size*0.025} />
                <rect x={size*0.3} y={size*0.425} width={size*0.4} height={size*0.15} fill="#2c3e50" rx={size*0.025} />
                <circle cx={size/2} cy={size/2} r={size*0.175} fill="none" stroke="#3498db" strokeWidth={size*0.015} />
                <circle cx={size/2} cy={size/2} r={size*0.25} fill="none" stroke="#3498db" strokeWidth={size*0.01} opacity="0.5" />
              </g>
            )}
            
            {/* Medical pulse line */}
            <path 
              d={`M${size*0.1} ${size*0.9} Q${size*0.2} ${size*0.85} ${size*0.25} ${size*0.9} T${size*0.4} ${size*0.9} Q${size*0.45} ${size*0.8} ${size/2} ${size*0.9} T${size*0.65} ${size*0.9} Q${size*0.75} ${size*0.85} ${size*0.9} ${size*0.9}`}
              fill="none" 
              stroke={config!.colors[1]} 
              strokeWidth={size*0.01} 
              opacity="0.6"
            />
          </>
        )}
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