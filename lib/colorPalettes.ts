import { MedicalAnalysis } from './medicalAnalyzer';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  gradientStops: string[];
}

export interface SubspecialtyColors {
  primary: ColorPalette;
  secondary: ColorPalette;
}

// Emotional tone color mappings
const emotionalColorPalettes: Record<MedicalAnalysis['emotionalTone'], ColorPalette> = {
  hope: {
    primary: '#4CAF50',
    secondary: '#81C784', 
    accent: '#C8E6C9',
    background: '#E8F5E8',
    gradientStops: ['#4CAF50', '#66BB6A', '#A5D6A7']
  },
  concern: {
    primary: '#F44336',
    secondary: '#EF5350',
    accent: '#FFCDD2', 
    background: '#FFEBEE',
    gradientStops: ['#F44336', '#E57373', '#FFCDD2']
  },
  confidence: {
    primary: '#2196F3',
    secondary: '#42A5F5',
    accent: '#BBDEFB',
    background: '#E3F2FD',
    gradientStops: ['#1976D2', '#2196F3', '#64B5F6']
  },
  frustration: {
    primary: '#FF9800',
    secondary: '#FFB74D',
    accent: '#FFE0B2',
    background: '#FFF3E0',
    gradientStops: ['#F57C00', '#FF9800', '#FFCC02']
  },
  uncertainty: {
    primary: '#9E9E9E',
    secondary: '#BDBDBD',
    accent: '#F5F5F5',
    background: '#FAFAFA',
    gradientStops: ['#757575', '#9E9E9E', '#E0E0E0']
  },
  neutral: {
    primary: '#607D8B',
    secondary: '#78909C',
    accent: '#CFD8DC',
    background: '#ECEFF1',
    gradientStops: ['#455A64', '#607D8B', '#90A4AE']
  }
};

// Subspecialty-specific color schemes
const subspecialtyColorPalettes: Record<MedicalAnalysis['subspecialty'], SubspecialtyColors> = {
  'sports-medicine': {
    primary: {
      primary: '#FF6B35',
      secondary: '#F7931E',
      accent: '#FFE135',
      background: '#FFF8E1',
      gradientStops: ['#FF6B35', '#FF8F65', '#FFB347']
    },
    secondary: {
      primary: '#4CAF50',
      secondary: '#66BB6A',
      accent: '#A5D6A7',
      background: '#E8F5E8',
      gradientStops: ['#388E3C', '#4CAF50', '#81C784']
    }
  },
  'joint-replacement': {
    primary: {
      primary: '#3F51B5',
      secondary: '#5C6BC0',
      accent: '#C5CAE9',
      background: '#E8EAF6',
      gradientStops: ['#303F9F', '#3F51B5', '#7986CB']
    },
    secondary: {
      primary: '#607D8B',
      secondary: '#78909C',
      accent: '#B0BEC5',
      background: '#ECEFF1',
      gradientStops: ['#455A64', '#607D8B', '#90A4AE']
    }
  },
  'trauma': {
    primary: {
      primary: '#D32F2F',
      secondary: '#F44336',
      accent: '#FFCDD2',
      background: '#FFEBEE',
      gradientStops: ['#C62828', '#D32F2F', '#EF5350']
    },
    secondary: {
      primary: '#FF5722',
      secondary: '#FF7043',
      accent: '#FFCCBC',
      background: '#FFF3E0',
      gradientStops: ['#E64A19', '#FF5722', '#FF8A65']
    }
  },
  'spine': {
    primary: {
      primary: '#795548',
      secondary: '#8D6E63',
      accent: '#D7CCC8',
      background: '#EFEBE9',
      gradientStops: ['#5D4037', '#795548', '#A1887F']
    },
    secondary: {
      primary: '#9C27B0',
      secondary: '#AB47BC',
      accent: '#E1BEE7',
      background: '#F3E5F5',
      gradientStops: ['#7B1FA2', '#9C27B0', '#BA68C8']
    }
  },
  'hand-foot': {
    primary: {
      primary: '#E91E63',
      secondary: '#F06292',
      accent: '#F8BBD9',
      background: '#FCE4EC',
      gradientStops: ['#C2185B', '#E91E63', '#F06292']
    },
    secondary: {
      primary: '#FF9800',
      secondary: '#FFB74D',
      accent: '#FFE0B2',
      background: '#FFF3E0',
      gradientStops: ['#F57C00', '#FF9800', '#FFCC02']
    }
  },
  'general': {
    primary: {
      primary: '#2196F3',
      secondary: '#42A5F5',
      accent: '#BBDEFB',
      background: '#E3F2FD',
      gradientStops: ['#1976D2', '#2196F3', '#64B5F6']
    },
    secondary: {
      primary: '#607D8B',
      secondary: '#78909C',
      accent: '#CFD8DC',
      background: '#ECEFF1',
      gradientStops: ['#455A64', '#607D8B', '#90A4AE']
    }
  }
};

export class ColorPaletteGenerator {
  generatePalette(analysis: MedicalAnalysis): ColorPalette {
    // Start with emotional tone palette
    const emotionalPalette = emotionalColorPalettes[analysis.emotionalTone];
    
    // Get subspecialty colors for blending
    const subspecialtyColors = subspecialtyColorPalettes[analysis.subspecialty];
    
    // Blend emotional tone with subspecialty colors based on complexity
    const blendFactor = Math.min(analysis.complexityLevel / 10, 0.7);
    
    return {
      primary: this.blendColors(emotionalPalette.primary, subspecialtyColors.primary.primary, blendFactor),
      secondary: this.blendColors(emotionalPalette.secondary, subspecialtyColors.primary.secondary, blendFactor),
      accent: this.blendColors(emotionalPalette.accent, subspecialtyColors.primary.accent, blendFactor * 0.5),
      background: this.blendColors(emotionalPalette.background, subspecialtyColors.primary.background, blendFactor * 0.3),
      gradientStops: this.blendGradientStops(emotionalPalette.gradientStops, subspecialtyColors.primary.gradientStops, blendFactor)
    };
  }

  private blendColors(color1: string, color2: string, factor: number): string {
    // Convert hex to RGB
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return color1;
    
    // Blend RGB values
    const r = Math.round(rgb1.r * (1 - factor) + rgb2.r * factor);
    const g = Math.round(rgb1.g * (1 - factor) + rgb2.g * factor);
    const b = Math.round(rgb1.b * (1 - factor) + rgb2.b * factor);
    
    return this.rgbToHex(r, g, b);
  }

  private blendGradientStops(stops1: string[], stops2: string[], factor: number): string[] {
    return stops1.map((stop, index) => {
      const correspondingStop = stops2[index] || stops2[stops2.length - 1];
      return this.blendColors(stop, correspondingStop, factor);
    });
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Get colors for specific treatment contexts
  getTreatmentContextColors(context: MedicalAnalysis['treatmentContext']): Partial<ColorPalette> {
    switch (context) {
      case 'post-surgical':
        return {
          accent: '#E8F5E8', // Healing green
          gradientStops: ['#4CAF50', '#81C784', '#C8E6C9']
        };
      case 'rehabilitation':
        return {
          accent: '#E3F2FD', // Progress blue
          gradientStops: ['#2196F3', '#64B5F6', '#BBDEFB']
        };
      case 'acute':
        return {
          accent: '#FFEBEE', // Urgent red
          gradientStops: ['#F44336', '#EF5350', '#FFCDD2']
        };
      case 'chronic':
        return {
          accent: '#FFF3E0', // Persistent orange
          gradientStops: ['#FF9800', '#FFB74D', '#FFE0B2']
        };
      default:
        return {};
    }
  }

  // Adjust colors based on time context
  adjustForTimeContext(palette: ColorPalette, timeContext: MedicalAnalysis['timeContext']): ColorPalette {
    switch (timeContext) {
      case 'acute':
        // Make colors more saturated and urgent
        return {
          ...palette,
          primary: this.adjustSaturation(palette.primary, 1.2),
          secondary: this.adjustSaturation(palette.secondary, 1.1)
        };
      case 'chronic':
        // Make colors more muted and stable
        return {
          ...palette,
          primary: this.adjustSaturation(palette.primary, 0.8),
          secondary: this.adjustSaturation(palette.secondary, 0.9)
        };
      default:
        return palette;
    }
  }

  private adjustSaturation(color: string, factor: number): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;

    // Convert to HSL, adjust saturation, convert back
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.s = Math.min(1, Math.max(0, hsl.s * factor));
    const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    
    return this.rgbToHex(Math.round(newRgb.r), Math.round(newRgb.g), Math.round(newRgb.b));
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }
}

export const colorPaletteGenerator = new ColorPaletteGenerator();