'use client';

import { useState, useEffect } from 'react';
import ArtworkGenerator from './ArtworkGenerator';

interface ArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  response: string;
}

export default function ArtworkModal({ isOpen, onClose, question, response }: ArtworkModalProps) {
  const [theme, setTheme] = useState<'bone' | 'muscle' | 'joint' | 'general'>('general');

  useEffect(() => {
    // Auto-detect theme based on question content
    const questionLower = question.toLowerCase();
    if (questionLower.includes('bone') || questionLower.includes('fracture') || questionLower.includes('break')) {
      setTheme('bone');
    } else if (questionLower.includes('muscle') || questionLower.includes('strain') || questionLower.includes('tear')) {
      setTheme('muscle');
    } else if (questionLower.includes('joint') || questionLower.includes('knee') || questionLower.includes('shoulder') || questionLower.includes('hip')) {
      setTheme('joint');
    } else {
      setTheme('general');
    }
  }, [question]);

  if (!isOpen) return null;

  const downloadArtwork = () => {
    const svg = document.getElementById('ortho-artwork');
    if (!svg || !(svg instanceof SVGElement)) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 800;
    canvas.height = 600;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `orthoiq-artwork-${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Generated Artwork</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Theme Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose artwork theme:
            </label>
            <div className="flex space-x-2">
              {(['bone', 'muscle', 'joint', 'general'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === t
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Artwork Display */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <ArtworkGenerator theme={theme} />
          </div>

          {/* Question Context */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Related Question:</h3>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {question}
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={downloadArtwork}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              📥 Download PNG
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}