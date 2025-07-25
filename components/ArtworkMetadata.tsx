import { MedicalAnalysis } from '@/lib/medicalAnalyzer';
import { ColorPalette } from '@/lib/colorPalettes';
import { ArtworkSeed } from '@/lib/artworkSeeds';

interface ArtworkMetadataProps {
  analysis: MedicalAnalysis;
  palette: ColorPalette;
  seed: ArtworkSeed;
  question: string;
  className?: string;
}

export default function ArtworkMetadata({ 
  analysis, 
  palette, 
  seed, 
  question,
  className = "" 
}: ArtworkMetadataProps) {
  const formatTimestamp = () => {
    return new Date().toISOString().split('T')[0] + ' ' + 
           new Date().toTimeString().split(' ')[0] + ' UTC';
  };

  const getEmotionalToneDisplay = (tone: MedicalAnalysis['emotionalTone']) => {
    const toneMap = {
      hope: 'Hope & Recovery',
      concern: 'Concern & Urgency',
      confidence: 'Confidence & Strength',
      frustration: 'Frustration & Challenge',
      uncertainty: 'Uncertainty & Inquiry',
      neutral: 'Neutral & Balanced'
    };
    return toneMap[tone];
  };

  const getSubspecialtyDisplay = (subspecialty: MedicalAnalysis['subspecialty']) => {
    const specialtyMap = {
      'sports-medicine': 'Sports Medicine',
      'joint-replacement': 'Joint Replacement',
      'trauma': 'Trauma & Emergency',
      'spine': 'Spine & Back',
      'hand-foot': 'Hand & Foot',
      'general': 'General Orthopedics'
    };
    return specialtyMap[subspecialty];
  };

  const getColorPaletteDescription = () => {
    // Determine dominant color theme
    const primary = palette.primary.toLowerCase();
    if (primary.includes('green') || primary.includes('#4caf50') || primary.includes('#66bb6a')) {
      return 'Healing Greens';
    } else if (primary.includes('red') || primary.includes('#f44336') || primary.includes('#d32f2f')) {
      return 'Urgent Reds';
    } else if (primary.includes('blue') || primary.includes('#2196f3') || primary.includes('#1976d2')) {
      return 'Confident Blues';
    } else if (primary.includes('orange') || primary.includes('#ff9800') || primary.includes('#f57c00')) {
      return 'Dynamic Oranges';
    } else if (primary.includes('gray') || primary.includes('#9e9e9e') || primary.includes('#757575')) {
      return 'Neutral Grays';
    } else {
      return 'Custom Palette';
    }
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="text-xl mr-2">🎨</span>
        Artwork Metadata
      </h3>
      
      <div className="space-y-3 text-sm">
        {/* Generation ID */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Generation ID:</span>
          <span className="font-mono text-blue-600 text-xs">
            0x{seed.hash.substring(0, 8)}...
          </span>
        </div>

        {/* Medical Focus */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Medical Focus:</span>
          <span className="text-gray-800 font-medium">
            {getSubspecialtyDisplay(analysis.subspecialty)}
          </span>
        </div>

        {/* Emotional Tone */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Emotional Tone:</span>
          <span className="text-gray-800">
            {getEmotionalToneDisplay(analysis.emotionalTone)}
          </span>
        </div>

        {/* Complexity Score */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Complexity:</span>
          <div className="flex items-center space-x-2">
            <span className="text-gray-800 font-medium">{analysis.complexityLevel}/10</span>
            <div className="w-16 h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(analysis.complexityLevel / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Color Palette:</span>
          <div className="flex items-center space-x-2">
            <span className="text-gray-800">{getColorPaletteDescription()}</span>
            <div className="flex space-x-1">
              {palette.gradientStops.slice(0, 3).map((color, index) => (
                <div
                  key={index}
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: color }}
                  title={color}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Body Parts Detected */}
        {analysis.bodyParts.length > 0 && (
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium">Body Parts:</span>
            <span className="text-gray-800 text-right">
              {analysis.bodyParts.join(', ')}
            </span>
          </div>
        )}

        {/* Conditions Detected */}
        {analysis.conditions.length > 0 && (
          <div className="flex justify-between items-start">
            <span className="text-gray-600 font-medium">Conditions:</span>
            <span className="text-gray-800 text-right">
              {analysis.conditions.join(', ')}
            </span>
          </div>
        )}

        {/* Generated Timestamp */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="text-gray-600 font-medium">Generated:</span>
          <span className="text-gray-800 font-mono text-xs">
            {formatTimestamp()}
          </span>
        </div>

        {/* Algorithm Version */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Algorithm:</span>
          <span className="text-gray-800 font-medium">
            Arthrokinetix v1.0
          </span>
        </div>

        {/* Question Context (abbreviated) */}
        <div className="pt-2 border-t border-gray-200">
          <span className="text-gray-600 font-medium block mb-1">Question Context:</span>
          <p className="text-gray-700 text-xs italic leading-relaxed">
            &ldquo;{question.length > 80 ? question.substring(0, 80) + '...' : question}&rdquo;
          </p>
        </div>

        {/* Technical Stats */}
        <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Seed Value:</span>
            <div className="font-mono text-gray-700">{seed.value.toFixed(6)}</div>
          </div>
          <div>
            <span className="text-gray-500">Medical Terms:</span>
            <div className="text-gray-700">{analysis.medicalTermCount}</div>
          </div>
        </div>
      </div>

      {/* Collectible Badge */}
      <div className="mt-4 p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border border-purple-200">
        <div className="flex items-center justify-center space-x-2">
          <span className="text-purple-600">✨</span>
          <span className="text-sm font-medium text-purple-800">
            Unique Digital Medical Art
          </span>
          <span className="text-purple-600">✨</span>
        </div>
        <p className="text-xs text-purple-600 text-center mt-1">
          Generated using medical AI analysis
        </p>
      </div>
    </div>
  );
}