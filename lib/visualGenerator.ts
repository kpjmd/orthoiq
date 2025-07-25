import { MedicalAnalysis } from './medicalAnalyzer';
import { ColorPalette } from './colorPalettes';
import { ArtworkSeed } from './artworkSeeds';

export interface SVGElement {
  type: 'path' | 'circle' | 'ellipse' | 'rect' | 'polygon' | 'line';
  attributes: Record<string, string | number>;
  className?: string;
}

export interface LayeredComposition {
  background: SVGElement[];
  structural: SVGElement[];
  detail: SVGElement[];
  overlay: SVGElement[];
}

export class VisualGenerator {
  generateComposition(
    analysis: MedicalAnalysis,
    palette: ColorPalette,
    seed: ArtworkSeed,
    size: number = 200
  ): LayeredComposition {
    return {
      background: this.generateBackground(analysis, palette, seed, size),
      structural: this.generateStructuralLayer(analysis, palette, seed, size),
      detail: this.generateDetailLayer(analysis, palette, seed, size),
      overlay: this.generateOverlayLayer(analysis, palette, seed, size)
    };
  }

  private generateBackground(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Base gradient background
    elements.push({
      type: 'rect',
      attributes: {
        x: 0,
        y: 0,
        width: size,
        height: size,
        fill: `url(#gradient-${seed.hash.substring(0, 6)})`,
        rx: size * 0.1
      }
    });

    // Add texture based on subspecialty
    const textureElements = this.generateTexturePattern(analysis.subspecialty, palette, seed, size);
    elements.push(...textureElements);

    return elements;
  }

  private generateStructuralLayer(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    switch (analysis.subspecialty) {
      case 'spine':
        return this.generateSpineStructure(analysis, palette, seed, size);
      case 'sports-medicine':
        return this.generateSportsStructure(analysis, palette, seed, size);
      case 'joint-replacement':
        return this.generateJointStructure(analysis, palette, seed, size);
      case 'trauma':
        return this.generateTraumaStructure(analysis, palette, seed, size);
      case 'hand-foot':
        return this.generateExtremityStructure(analysis, palette, seed, size);
      default:
        return this.generateGeneralStructure(analysis, palette, seed, size);
    }
  }

  private generateSpineStructure(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const centerX = size / 2;
    const vertebraeCount = Math.min(Math.max(5, analysis.complexityLevel), 12);
    const vertebraeSpacing = (size * 0.7) / vertebraeCount;
    
    // Generate vertebrae
    for (let i = 0; i < vertebraeCount; i++) {
      const y = size * 0.15 + i * vertebraeSpacing;
      const variation = seed.variations.position * 0.1;
      const x = centerX + (Math.sin(i * 0.5) * variation * size);
      const vertebraSize = (size * 0.08) * (1 + seed.variations.scale * 0.3);
      
      // Vertebra body
      elements.push({
        type: 'ellipse',
        attributes: {
          cx: x,
          cy: y,
          rx: vertebraSize,
          ry: vertebraSize * 0.6,
          fill: palette.primary,
          opacity: 0.8,
          transform: `rotate(${seed.variations.rotation * 10} ${x} ${y})`
        }
      });

      // Vertebra processes (if complex enough)
      if (analysis.complexityLevel > 3) {
        elements.push({
          type: 'circle',
          attributes: {
            cx: x - vertebraSize * 0.8,
            cy: y,
            r: vertebraSize * 0.3,
            fill: palette.secondary,
            opacity: 0.6
          }
        });
        elements.push({
          type: 'circle',
          attributes: {
            cx: x + vertebraSize * 0.8,
            cy: y,
            r: vertebraSize * 0.3,
            fill: palette.secondary,
            opacity: 0.6
          }
        });
      }
    }

    // Spinal cord representation
    const pathData = this.generateSpinalCord(centerX, size, vertebraeCount, seed);
    elements.push({
      type: 'path',
      attributes: {
        d: pathData,
        stroke: palette.accent,
        'stroke-width': size * 0.015,
        fill: 'none',
        opacity: 0.7
      }
    });

    return elements;
  }

  private generateSportsStructure(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Dynamic flow lines suggesting movement
    const flowLines = this.generateFlowLines(analysis, palette, seed, size);
    elements.push(...flowLines);
    
    // Energy burst patterns
    const energyBursts = this.generateEnergyBursts(analysis, palette, seed, size);
    elements.push(...energyBursts);
    
    return elements;
  }

  private generateJointStructure(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Joint socket
    elements.push({
      type: 'circle',
      attributes: {
        cx: centerX,
        cy: centerY,
        r: size * 0.25,
        fill: palette.primary,
        opacity: 0.7
      }
    });

    // Joint ball
    elements.push({
      type: 'circle',
      attributes: {
        cx: centerX + seed.variations.position * size * 0.1,
        cy: centerY + seed.variations.position * size * 0.1,
        r: size * 0.18,
        fill: palette.secondary,
        opacity: 0.8
      }
    });

    // Geometric stability patterns
    const stabilityPattern = this.generateStabilityPattern(centerX, centerY, size, seed, palette);
    elements.push(...stabilityPattern);

    return elements;
  }

  private generateTraumaStructure(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Angular impact patterns
    const impactPatterns = this.generateImpactPatterns(analysis, palette, seed, size);
    elements.push(...impactPatterns);
    
    // Fracture line aesthetics
    if (analysis.conditions.includes('fracture')) {
      const fractureLines = this.generateFractureLines(palette, seed, size);
      elements.push(...fractureLines);
    }
    
    return elements;
  }

  private generateExtremityStructure(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Intricate detailed patterns
    const detailPatterns = this.generateDetailPatterns(analysis, palette, seed, size);
    elements.push(...detailPatterns);
    
    return elements;
  }

  private generateGeneralStructure(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Andry Tree structure - trunk, branches, roots
    const trunk = this.generateTrunk(centerX, centerY, size, seed, palette);
    const branches = this.generateBranches(centerX, centerY, size, analysis.complexityLevel, seed, palette);
    const roots = this.generateRoots(centerX, centerY, size, analysis.medicalTermCount, seed, palette);
    
    elements.push(...roots, ...trunk, ...branches);
    
    return elements;
  }

  private generateDetailLayer(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Add medical symbols or indicators based on conditions
    if (analysis.conditions.includes('pain')) {
      const painIndicators = this.generatePainIndicators(palette, seed, size);
      elements.push(...painIndicators);
    }
    
    if (analysis.conditions.includes('inflammation')) {
      const inflammationPattern = this.generateInflammationPattern(palette, seed, size);
      elements.push(...inflammationPattern);
    }
    
    return elements;
  }

  private generateOverlayLayer(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Healing progression indicators
    if (analysis.treatmentContext === 'post-surgical' || analysis.treatmentContext === 'rehabilitation') {
      const healingIndicators = this.generateHealingIndicators(palette, seed, size);
      elements.push(...healingIndicators);
    }
    
    // Data flow lines (like medical pulse)
    const dataFlow = this.generateDataFlow(palette, seed, size);
    elements.push(...dataFlow);
    
    return elements;
  }

  // Helper methods for specific pattern generation
  private generateTexturePattern(subspecialty: MedicalAnalysis['subspecialty'], palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const density = Math.floor(seed.variations.density * 20) + 5;
    
    for (let i = 0; i < density; i++) {
      const elementSeed = (seed.value + i * 0.137) % 1;
      elements.push({
        type: 'circle',
        attributes: {
          cx: elementSeed * size,
          cy: ((elementSeed * 7) % 1) * size,
          r: size * 0.01 * (1 + seed.variations.scale),
          fill: palette.accent,
          opacity: 0.3
        }
      });
    }
    
    return elements;
  }

  private generateSpinalCord(centerX: number, size: number, vertebraeCount: number, seed: ArtworkSeed): string {
    let path = `M ${centerX} ${size * 0.1}`;
    
    for (let i = 1; i <= vertebraeCount; i++) {
      const y = size * 0.15 + i * (size * 0.7) / vertebraeCount;
      const x = centerX + Math.sin(i * 0.5) * seed.variations.position * size * 0.05;
      path += ` L ${x} ${y}`;
    }
    
    return path;
  }

  private generateFlowLines(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const lineCount = Math.min(analysis.complexityLevel + 2, 8);
    
    for (let i = 0; i < lineCount; i++) {
      const startX = (seed.value + i * 0.1) * size;
      const startY = (seed.value + i * 0.2) * size;
      const endX = ((seed.value + i * 0.3) % 1) * size;
      const endY = ((seed.value + i * 0.4) % 1) * size;
      
      elements.push({
        type: 'line',
        attributes: {
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          stroke: palette.primary,
          'stroke-width': size * 0.01,
          opacity: 0.6
        }
      });
    }
    
    return elements;
  }

  private generateEnergyBursts(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const burstCount = Math.max(1, Math.floor(analysis.complexityLevel / 3));
    
    for (let i = 0; i < burstCount; i++) {
      const centerX = ((seed.value + i * 0.5) % 1) * size;
      const centerY = ((seed.value + i * 0.6) % 1) * size;
      const radius = size * 0.1 * (1 + seed.variations.scale);
      
      elements.push({
        type: 'circle',
        attributes: {
          cx: centerX,
          cy: centerY,
          r: radius,
          fill: 'none',
          stroke: palette.accent,
          'stroke-width': size * 0.005,
          opacity: 0.5
        }
      });
    }
    
    return elements;
  }

  private generateStabilityPattern(centerX: number, centerY: number, size: number, seed: ArtworkSeed, palette: ColorPalette): SVGElement[] {
    const elements: SVGElement[] = [];
    const sides = 6; // Hexagonal stability pattern
    const radius = size * 0.15;
    
    let pathData = '';
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI) / sides;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      pathData += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    
    elements.push({
      type: 'path',
      attributes: {
        d: pathData,
        stroke: palette.secondary,
        'stroke-width': size * 0.01,
        fill: 'none',
        opacity: 0.6
      }
    });
    
    return elements;
  }

  private generateImpactPatterns(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const impactCount = Math.min(analysis.complexityLevel, 5);
    
    for (let i = 0; i < impactCount; i++) {
      const angle = (seed.value + i * 0.2) * Math.PI * 2;
      const centerX = size / 2;
      const centerY = size / 2;
      const length = size * 0.3 * (1 + seed.variations.scale);
      
      const endX = centerX + Math.cos(angle) * length;
      const endY = centerY + Math.sin(angle) * length;
      
      elements.push({
        type: 'line',
        attributes: {
          x1: centerX,
          y1: centerY,
          x2: endX,
          y2: endY,
          stroke: palette.primary,
          'stroke-width': size * 0.015,
          opacity: 0.7,
          'stroke-linecap': 'round'
        }
      });
    }
    
    return elements;
  }

  private generateFractureLines(palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const lineCount = 2 + Math.floor(seed.variations.complexity * 3);
    
    for (let i = 0; i < lineCount; i++) {
      const startX = (seed.value + i * 0.15) * size;
      const startY = ((seed.value + i * 0.25) % 1) * size;
      const length = seed.variations.scale * size * 0.4;
      const angle = seed.variations.rotation * Math.PI;
      
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;
      
      elements.push({
        type: 'line',
        attributes: {
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          stroke: palette.secondary,
          'stroke-width': size * 0.008,
          opacity: 0.8,
          'stroke-dasharray': `${size * 0.02},${size * 0.01}`
        }
      });
    }
    
    return elements;
  }

  private generateDetailPatterns(analysis: MedicalAnalysis, palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const patternCount = analysis.complexityLevel * 2;
    
    for (let i = 0; i < patternCount; i++) {
      const x = ((seed.value + i * 0.1) % 1) * size;
      const y = ((seed.value + i * 0.2) % 1) * size;
      const radius = size * 0.02 * (0.5 + seed.variations.scale);
      
      elements.push({
        type: 'circle',
        attributes: {
          cx: x,
          cy: y,
          r: radius,
          fill: palette.accent,
          opacity: 0.4
        }
      });
    }
    
    return elements;
  }

  private generateTrunk(centerX: number, centerY: number, size: number, seed: ArtworkSeed, palette: ColorPalette): SVGElement[] {
    const elements: SVGElement[] = [];
    const trunkHeight = size * 0.4;
    const trunkWidth = size * 0.06;
    
    elements.push({
      type: 'rect',
      attributes: {
        x: centerX - trunkWidth / 2,
        y: centerY - trunkHeight / 2,
        width: trunkWidth,
        height: trunkHeight,
        fill: palette.primary,
        rx: trunkWidth * 0.3,
        opacity: 0.8
      }
    });
    
    return elements;
  }

  private generateBranches(centerX: number, centerY: number, size: number, complexity: number, seed: ArtworkSeed, palette: ColorPalette): SVGElement[] {
    const elements: SVGElement[] = [];
    const branchCount = Math.min(complexity, 6);
    
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2;
      const length = size * 0.15 * (0.8 + seed.variations.scale * 0.4);
      const endX = centerX + Math.cos(angle) * length;
      const endY = centerY + Math.sin(angle) * length;
      
      elements.push({
        type: 'line',
        attributes: {
          x1: centerX,
          y1: centerY,
          x2: endX,
          y2: endY,
          stroke: palette.secondary,
          'stroke-width': size * 0.01,
          opacity: 0.7
        }
      });
    }
    
    return elements;
  }

  private generateRoots(centerX: number, centerY: number, size: number, termCount: number, seed: ArtworkSeed, palette: ColorPalette): SVGElement[] {
    const elements: SVGElement[] = [];
    const rootCount = Math.min(termCount, 8);
    
    for (let i = 0; i < rootCount; i++) {
      const angle = Math.PI + (i / rootCount - 0.5) * Math.PI;
      const length = size * 0.12 * (0.7 + seed.variations.scale * 0.6);
      const endX = centerX + Math.cos(angle) * length;
      const endY = centerY + Math.sin(angle) * length;
      
      elements.push({
        type: 'line',
        attributes: {
          x1: centerX,
          y1: centerY,
          x2: endX,
          y2: endY,
          stroke: palette.accent,
          'stroke-width': size * 0.005,
          opacity: 0.5
        }
      });
    }
    
    return elements;
  }

  private generatePainIndicators(palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    const indicatorCount = 3;
    
    for (let i = 0; i < indicatorCount; i++) {
      const x = ((seed.value + i * 0.3) % 1) * size;
      const y = ((seed.value + i * 0.4) % 1) * size;
      
      // Pain radiating pattern
      elements.push({
        type: 'circle',
        attributes: {
          cx: x,
          cy: y,
          r: size * 0.03,
          fill: 'none',
          stroke: '#ff4444',
          'stroke-width': size * 0.003,
          opacity: 0.6
        }
      });
    }
    
    return elements;
  }

  private generateInflammationPattern(palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Subtle glow effect
    elements.push({
      type: 'circle',
      attributes: {
        cx: size / 2,
        cy: size / 2,
        r: size * 0.25,
        fill: '#ffaa00',
        opacity: 0.2
      }
    });
    
    return elements;
  }

  private generateHealingIndicators(palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Healing progress arc
    const progress = seed.variations.complexity;
    const circumference = 2 * Math.PI * size * 0.15;
    const dashArray = `${circumference * progress} ${circumference * (1 - progress)}`;
    
    elements.push({
      type: 'circle',
      attributes: {
        cx: size / 2,
        cy: size / 2,
        r: size * 0.15,
        fill: 'none',
        stroke: '#4CAF50',
        'stroke-width': size * 0.01,
        'stroke-dasharray': dashArray,
        'stroke-linecap': 'round',
        opacity: 0.7,
        transform: `rotate(-90 ${size / 2} ${size / 2})`
      }
    });
    
    return elements;
  }

  private generateDataFlow(palette: ColorPalette, seed: ArtworkSeed, size: number): SVGElement[] {
    const elements: SVGElement[] = [];
    
    // Medical pulse line at bottom
    const pulsePoints = 20;
    let pathData = `M 0 ${size * 0.9}`;
    
    for (let i = 1; i <= pulsePoints; i++) {
      const x = (i / pulsePoints) * size;
      const baseY = size * 0.9;
      const pulseY = baseY + Math.sin(i * 0.8) * seed.variations.density * size * 0.05;
      pathData += ` L ${x} ${pulseY}`;
    }
    
    elements.push({
      type: 'path',
      attributes: {
        d: pathData,
        stroke: palette.accent,
        'stroke-width': size * 0.008,
        fill: 'none',
        opacity: 0.6
      }
    });
    
    return elements;
  }
}

export const visualGenerator = new VisualGenerator();