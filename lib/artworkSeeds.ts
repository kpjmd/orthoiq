import { MedicalAnalysis } from './medicalAnalyzer';

export interface ArtworkSeed {
  value: number;
  hash: string;
  variations: {
    position: number;
    rotation: number;
    scale: number;
    density: number;
    complexity: number;
  };
}

export class ArtworkSeedGenerator {
  private readonly PRIME_MULTIPLIERS = [31, 37, 41, 43, 47];

  generateSeed(question: string, analysis: MedicalAnalysis): ArtworkSeed {
    const hash = this.hashString(question);
    const value = this.hashToNumber(hash);
    
    return {
      value,
      hash,
      variations: this.generateVariations(value, analysis)
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private hashToNumber(hash: string): number {
    // Convert hash to a number between 0 and 1
    const num = parseInt(hash.substring(0, 8), 16);
    return num / 0xFFFFFFFF;
  }

  private generateVariations(seed: number, analysis: MedicalAnalysis): ArtworkSeed['variations'] {
    // Use different prime multipliers for different variation types
    const seedInt = Math.floor(seed * 1000000);
    
    return {
      position: this.seededRandom(seedInt * this.PRIME_MULTIPLIERS[0]),
      rotation: this.seededRandom(seedInt * this.PRIME_MULTIPLIERS[1]),
      scale: this.seededRandom(seedInt * this.PRIME_MULTIPLIERS[2]),
      density: this.seededRandom(seedInt * this.PRIME_MULTIPLIERS[3]) * (analysis.complexityLevel / 10),
      complexity: Math.min(analysis.complexityLevel / 10, 1)
    };
  }

  private seededRandom(seed: number): number {
    // Linear congruential generator for predictable randomness
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    seed = (a * seed + c) % m;
    return Math.abs(seed) / m;
  }

  // Generate specific seeds for different visual elements
  generateElementSeeds(baseSeed: ArtworkSeed, elementCount: number): number[] {
    const seeds: number[] = [];
    const baseValue = baseSeed.value;
    
    for (let i = 0; i < elementCount; i++) {
      const elementSeed = this.seededRandom(Math.floor(baseValue * 1000000) + i * 137);
      seeds.push(elementSeed);
    }
    
    return seeds;
  }

  // Generate position variations based on analysis
  generatePositions(seed: ArtworkSeed, analysis: MedicalAnalysis, count: number): Array<{x: number, y: number}> {
    const positions: Array<{x: number, y: number}> = [];
    const baseSeeds = this.generateElementSeeds(seed, count * 2);
    
    // Adjust distribution based on subspecialty
    const distribution = this.getDistributionPattern(analysis.subspecialty);
    
    for (let i = 0; i < count; i++) {
      const xSeed = baseSeeds[i * 2];
      const ySeed = baseSeeds[i * 2 + 1];
      
      positions.push({
        x: this.applyDistribution(xSeed, distribution.x),
        y: this.applyDistribution(ySeed, distribution.y)
      });
    }
    
    return positions;
  }

  private getDistributionPattern(subspecialty: MedicalAnalysis['subspecialty']): {x: 'center' | 'spread' | 'linear', y: 'center' | 'spread' | 'linear'} {
    switch (subspecialty) {
      case 'spine':
        return { x: 'center', y: 'linear' }; // Vertical alignment
      case 'sports-medicine':
        return { x: 'spread', y: 'spread' }; // Dynamic spread
      case 'joint-replacement':
        return { x: 'center', y: 'center' }; // Centralized structure
      case 'trauma':
        return { x: 'spread', y: 'spread' }; // Impact patterns
      case 'hand-foot':
        return { x: 'linear', y: 'center' }; // Horizontal alignment
      default:
        return { x: 'center', y: 'center' };
    }
  }

  private applyDistribution(seed: number, pattern: 'center' | 'spread' | 'linear'): number {
    switch (pattern) {
      case 'center':
        // Gaussian-like distribution around center
        return 0.3 + (seed * 0.4);
      case 'spread':
        // Even distribution across range
        return seed;
      case 'linear':
        // Prefer certain areas
        return seed < 0.5 ? seed * 0.6 : 0.4 + (seed - 0.5) * 1.2;
      default:
        return seed;
    }
  }

  // Generate scales based on medical context
  generateScales(seed: ArtworkSeed, analysis: MedicalAnalysis, count: number): number[] {
    const baseSeeds = this.generateElementSeeds(seed, count);
    const scales: number[] = [];
    
    // Base scale factors based on treatment context
    const scaleRange = this.getScaleRange(analysis.treatmentContext);
    
    baseSeeds.forEach(elementSeed => {
      const scale = scaleRange.min + (elementSeed * (scaleRange.max - scaleRange.min));
      scales.push(scale);
    });
    
    return scales;
  }

  private getScaleRange(treatmentContext: MedicalAnalysis['treatmentContext']): {min: number, max: number} {
    switch (treatmentContext) {
      case 'acute':
        return { min: 0.8, max: 1.4 }; // Dramatic size variations
      case 'chronic':
        return { min: 0.9, max: 1.1 }; // Subtle variations
      case 'post-surgical':
        return { min: 0.7, max: 1.3 }; // Recovery progression
      case 'rehabilitation':
        return { min: 0.8, max: 1.2 }; // Building strength
      default:
        return { min: 0.8, max: 1.2 };
    }
  }

  // Generate rotations based on emotional tone
  generateRotations(seed: ArtworkSeed, analysis: MedicalAnalysis, count: number): number[] {
    const baseSeeds = this.generateElementSeeds(seed, count);
    const rotations: number[] = [];
    
    const rotationRange = this.getRotationRange(analysis.emotionalTone);
    
    baseSeeds.forEach(elementSeed => {
      const rotation = rotationRange.base + (elementSeed * rotationRange.variance);
      rotations.push(rotation);
    });
    
    return rotations;
  }

  private getRotationRange(emotionalTone: MedicalAnalysis['emotionalTone']): {base: number, variance: number} {
    switch (emotionalTone) {
      case 'concern':
        return { base: -15, variance: 30 }; // Slightly tilted, unsettled
      case 'hope':
        return { base: 0, variance: 10 }; // Mostly upright, positive
      case 'frustration':
        return { base: -20, variance: 40 }; // More dramatic angles
      case 'confidence':
        return { base: 0, variance: 5 }; // Stable, minimal rotation
      case 'uncertainty':
        return { base: -10, variance: 20 }; // Moderate variation
      default:
        return { base: 0, variance: 15 };
    }
  }

  // Generate opacity values for layering effects
  generateOpacities(seed: ArtworkSeed, analysis: MedicalAnalysis, count: number): number[] {
    const baseSeeds = this.generateElementSeeds(seed, count);
    const opacities: number[] = [];
    
    // Base opacity range based on complexity
    const baseOpacity = 0.6 + (analysis.complexityLevel / 10) * 0.3;
    const variance = 0.3;
    
    baseSeeds.forEach(elementSeed => {
      const opacity = Math.max(0.2, Math.min(1.0, baseOpacity + (elementSeed - 0.5) * variance));
      opacities.push(opacity);
    });
    
    return opacities;
  }

  // Generate timing for animations (if needed)
  generateTimings(seed: ArtworkSeed, count: number): number[] {
    const baseSeeds = this.generateElementSeeds(seed, count);
    return baseSeeds.map(s => s * 2000 + 500); // 0.5s to 2.5s delays
  }

  // Create deterministic color variations
  generateColorVariations(seed: ArtworkSeed, baseColor: string, count: number): string[] {
    const baseSeeds = this.generateElementSeeds(seed, count);
    const variations: string[] = [];
    
    baseSeeds.forEach(elementSeed => {
      const hueShift = (elementSeed - 0.5) * 30; // ±15 degree hue shift
      const saturationShift = (elementSeed - 0.5) * 0.2; // ±10% saturation
      const lightnessShift = (elementSeed - 0.5) * 0.1; // ±5% lightness
      
      const adjustedColor = this.adjustColor(baseColor, hueShift, saturationShift, lightnessShift);
      variations.push(adjustedColor);
    });
    
    return variations;
  }

  private adjustColor(hexColor: string, hueShift: number, saturationShift: number, lightnessShift: number): string {
    // Convert hex to HSL, adjust, convert back
    // This is a simplified version - in practice you'd want a more robust color library
    return hexColor; // Placeholder - would implement full HSL conversion
  }
}

export const artworkSeedGenerator = new ArtworkSeedGenerator();