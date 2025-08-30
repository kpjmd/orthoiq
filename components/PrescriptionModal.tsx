'use client';

import { useState, useRef } from 'react';
import PrescriptionGenerator from './PrescriptionGenerator';
import { PrescriptionData, PrescriptionMetadata } from '@/lib/types';
import { exportPrescription } from '@/lib/exportUtils';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  response: string;
  fid: string;
}

export default function PrescriptionModal({ isOpen, onClose, question, response, fid }: PrescriptionModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [prescriptionMetadata, setPrescriptionMetadata] = useState<PrescriptionMetadata | null>(null);
  const prescriptionRef = useRef<SVGSVGElement>(null);

  if (!isOpen) return null;

  const prescriptionData: PrescriptionData = {
    userQuestion: question,
    claudeResponse: response,
    confidence: 0.85, // Default confidence
    fid: fid,
    caseId: `modal-${Date.now()}`,
    timestamp: new Date().toISOString()
  };

  const sharePrescription = async () => {
    setIsSharing(true);
    setShareStatus('idle');

    try {
      // Create prescription share via API
      const shareResponse = await fetch('/api/share-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          response,
          confidence: 85,
          metadata: prescriptionMetadata ? {
            prescriptionId: prescriptionMetadata.id,
            rarity: prescriptionMetadata.rarity,
            theme: prescriptionMetadata.theme,
            verificationHash: prescriptionMetadata.verificationHash
          } : null
        })
      });

      if (!shareResponse.ok) {
        throw new Error('Failed to create share link');
      }

      const shareData = await shareResponse.json();
      const shareUrl = shareData.shareUrl;
      
      const shareText = `Just generated my OrthoIQ medical prescription! 📋 "${question.substring(0, 80)}${question.length > 80 ? '...' : ''}" Get AI-powered orthopedic insights reviewed by board-certified surgeons.`;
      
      const webShareData = {
        title: 'OrthoIQ Medical Prescription',
        text: shareText,
        url: shareUrl
      };

      // Try to use Web Share API if available
      if (navigator.share && navigator.canShare && navigator.canShare(webShareData)) {
        try {
          await navigator.share(webShareData);
          setShareStatus('success');
        } catch (shareError) {
          // Fallback to clipboard
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            setShareStatus('success');
          } else {
            throw new Error('Sharing not available');
          }
        }
      } else {
        // Fallback: copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
          setShareStatus('success');
        } else {
          alert(`Please copy this to share:\n\n${shareText}\n\n${shareUrl}`);
          setShareStatus('success');
        }
      }

      setTimeout(() => setShareStatus('idle'), 3000);
    } catch (error) {
      console.error('Error sharing prescription:', error);
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    } finally {
      setIsSharing(false);
    }
  };

  const handleExport = async (format: 'png' | 'svg' | 'instagram' | 'linkedin' | 'twitter') => {
    if (!prescriptionRef.current || !prescriptionMetadata) return;

    try {
      await exportPrescription(prescriptionRef.current, prescriptionData, prescriptionMetadata, { format });
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">Medical Prescription</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Prescription Content */}
        <div className="p-6">
          <div ref={prescriptionRef as any}>
            <PrescriptionGenerator
              data={prescriptionData}
              onGenerated={setPrescriptionMetadata}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t rounded-b-xl">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            {/* Export Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleExport('png')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
              >
                Download PNG
              </button>
              <button
                onClick={() => handleExport('svg')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
              >
                Download SVG
              </button>
              
              {/* Social Media Dropdown */}
              <div className="relative group">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                  Export for Social
                </button>
                <div className="absolute bottom-full mb-2 left-0 w-40 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExport('instagram')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                  >
                    Instagram Story
                  </button>
                  <button
                    onClick={() => handleExport('linkedin')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    LinkedIn Post
                  </button>
                  <button
                    onClick={() => handleExport('twitter')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
                  >
                    Twitter Card
                  </button>
                </div>
              </div>
            </div>

            {/* Share Button */}
            <div className="flex items-center gap-3">
              {shareStatus === 'success' && (
                <span className="text-green-600 text-sm">✓ Shared successfully!</span>
              )}
              {shareStatus === 'error' && (
                <span className="text-red-600 text-sm">✗ Share failed</span>
              )}
              <button
                onClick={sharePrescription}
                disabled={isSharing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                {isSharing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sharing...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔗</span>
                    Share Prescription
                  </>
                )}
              </button>
            </div>
          </div>
          
          {prescriptionMetadata && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Prescription ID: {prescriptionMetadata.id} • 
                Rarity: <span className="font-medium">{prescriptionMetadata.rarity.toUpperCase().replace('-', ' ')}</span> • 
                Verification: {prescriptionMetadata.verificationHash}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}