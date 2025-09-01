'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import PrescriptionGenerator from './PrescriptionGenerator';
import { PrescriptionData, PrescriptionMetadata } from '@/lib/types';
import { exportPrescription, copyPrescriptionAsImage } from '@/lib/exportUtils';
import { calculateQuestionComplexity, calculateRarity, generateMetadata } from '@/lib/prescriptionUtils';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  response: string;
  fid: string;
  inquiry?: string;
  keyPoints?: string[];
}

export default function PrescriptionModal({ isOpen, onClose, question, response, fid, inquiry, keyPoints }: PrescriptionModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [prescriptionMetadata, setPrescriptionMetadata] = useState<PrescriptionMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const prescriptionRef = useRef<SVGSVGElement>(null);
  
  // Use refs to store stable values that shouldn't change during modal lifecycle
  const stableTimestamp = useRef<string>('');
  const stableCaseId = useRef<string>('');

  // Stable prescription data to prevent re-renders
  const prescriptionData: PrescriptionData = useMemo(() => {
    // Generate stable values only once
    if (!stableTimestamp.current) {
      stableTimestamp.current = new Date().toISOString();
    }
    if (!stableCaseId.current) {
      stableCaseId.current = `modal-${Date.now()}`;
    }
    
    return {
      userQuestion: question,
      claudeResponse: response,
      confidence: 0.85, // Default confidence
      fid: fid,
      caseId: stableCaseId.current,
      timestamp: stableTimestamp.current,
      inquiry: inquiry,
      keyPoints: keyPoints
    };
  }, [question, response, fid, inquiry, keyPoints]);

  // Generate metadata directly in modal to ensure it's always available
  const generatedMetadata = useMemo(() => {
    console.log('Generating prescription metadata...', { question, response, inquiry, keyPoints });
    const complexity = calculateQuestionComplexity(prescriptionData.userQuestion);
    const rarity = calculateRarity(prescriptionData.confidence, complexity);
    const metadata = generateMetadata(prescriptionData, rarity);
    console.log('Generated metadata:', metadata);
    return metadata;
  }, [prescriptionData, question, response, inquiry, keyPoints]);

  // Reset state when modal opens and set metadata
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened, resetting state and setting metadata...');
      // Reset stable values for new prescription
      stableTimestamp.current = new Date().toISOString();
      stableCaseId.current = `modal-${Date.now()}`;
      
      setIsGenerating(true);
      setGenerationError(null);
      setPrescriptionMetadata(null);
      
      // Set the generated metadata immediately
      setTimeout(() => {
        console.log('Setting generated metadata:', generatedMetadata);
        setPrescriptionMetadata(generatedMetadata);
        setIsGenerating(false);
      }, 100); // Small delay to ensure DOM is ready
      
      // Fallback timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.warn('Prescription generation timed out, forcing completion with metadata');
        setPrescriptionMetadata(generatedMetadata);
        setIsGenerating(false);
      }, 10000); // 10 second timeout - increased from 5 seconds
      
      return () => clearTimeout(timeout);
    }
  }, [isOpen, generatedMetadata]);


  if (!isOpen) return null;

  const shareToSocial = async () => {
    if (!generatedMetadata) {
      console.error('No prescription metadata available for sharing');
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
      return;
    }

    setIsSharing(true);
    setShareStatus('idle');

    try {
      // Create prescription share using new endpoint
      const shareResponse = await fetch('/api/share-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          response,
          confidence: Math.round(prescriptionData.confidence * 100),
          inquiry: prescriptionData.inquiry,
          keyPoints: prescriptionData.keyPoints,
          prescriptionMetadata: {
            id: generatedMetadata.id,
            rarity: generatedMetadata.rarity,
            theme: generatedMetadata.theme,
            verificationHash: generatedMetadata.verificationHash
          }
        })
      });

      if (!shareResponse.ok) {
        throw new Error(`Failed to create share link: ${shareResponse.status}`);
      }

      const shareData = await shareResponse.json();
      const shareUrl = shareData.shareUrl;
      
      const shareText = `🩺 Just generated my OrthoIQ prescription! AI-powered orthopedic insights reviewed by board-certified surgeons.\n\n🎯 ${generatedMetadata.rarity.toUpperCase().replace('-', ' ')} • ${Math.round(prescriptionData.confidence * 100)}% confidence`;
      
      const webShareData = {
        title: 'OrthoIQ Medical Prescription',
        text: shareText,
        url: shareUrl
      };

      // Use Web Share API if available (mobile and supported platforms)
      if (navigator.share && navigator.canShare && navigator.canShare(webShareData)) {
        try {
          await navigator.share(webShareData);
          setShareStatus('success');
        } catch (shareError) {
          // User cancelled or error occurred, fallback to clipboard
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareUrl);
            setShareStatus('success');
          } else {
            throw new Error('Sharing cancelled or not available');
          }
        }
      } else {
        // Fallback to clipboard for desktop
        try {
          window.focus();
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareUrl);
            setShareStatus('success');
          } else {
            throw new Error('Clipboard API not available');
          }
        } catch (clipboardError) {
          console.warn('Clipboard failed, using fallback:', clipboardError);
          // Final fallback - manual copy
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          textArea.style.top = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (successful) {
            setShareStatus('success');
          } else {
            alert(`Please copy this link to share:\n\n${shareUrl}`);
            setShareStatus('success');
          }
        }
      }

      // Track the share
      if (generatedMetadata.id) {
        try {
          await fetch(`/api/prescriptions/${generatedMetadata.id}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid: prescriptionData.fid,
              platform: 'unified',
              shareUrl: shareUrl
            })
          });
        } catch (trackError) {
          console.warn('Failed to track share:', trackError);
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

  const shareAsImage = async () => {
    if (!generatedMetadata) {
      console.error('No prescription metadata available for image sharing');
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
      return;
    }

    // Find the SVG element within the prescription container
    const svgElement = prescriptionRef.current?.querySelector('svg') as SVGSVGElement;
    if (!svgElement) {
      console.error('No SVG element found for image sharing');
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
      return;
    }

    setIsSharing(true);
    setShareStatus('idle');

    try {
      await copyPrescriptionAsImage(svgElement);
      setShareStatus('success');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch (error) {
      console.error('Error sharing prescription as image:', error);
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    } finally {
      setIsSharing(false);
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
        <div className="p-6 relative">
          {/* Always render the PrescriptionGenerator */}
          <div ref={prescriptionRef as any}>
            <PrescriptionGenerator
              data={prescriptionData}
            />
          </div>
          
          {/* Loading overlay */}
          {isGenerating && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating prescription...</p>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {generationError && (
            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p className="text-red-600 mb-4">{generationError}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t rounded-b-xl">
          <div className="flex justify-center items-center gap-3">
            {shareStatus === 'success' && (
              <span className="text-green-600 text-sm">✓ Prescription shared!</span>
            )}
            {shareStatus === 'error' && (
              <span className="text-red-600 text-sm">✗ Share failed</span>
            )}
            <button
              onClick={shareToSocial}
              disabled={isSharing || isGenerating || generationError !== null || !generatedMetadata}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
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
                  Share Link
                </>
              )}
            </button>
            <button
              onClick={shareAsImage}
              disabled={isSharing || isGenerating || generationError !== null || !generatedMetadata}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
            >
              {isSharing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Copying...
                </>
              ) : (
                <>
                  <span className="mr-2">🖼️</span>
                  Copy Image
                </>
              )}
            </button>
          </div>
          
          {generatedMetadata && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Prescription ID: {generatedMetadata.id} • 
                Rarity: <span className="font-medium">{generatedMetadata.rarity.toUpperCase().replace('-', ' ')}</span> • 
                Verification: {generatedMetadata.verificationHash}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}