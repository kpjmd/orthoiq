'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IntelligenceCard from './IntelligenceCard';
import {
  IntelligenceCardData,
  mapConsultationToCardData,
  generateIntelligenceCardNFTMetadata,
  getTierConfig
} from '@/lib/intelligenceCardUtils';

interface IntelligenceCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawConsultationData?: any;
  userFeedback?: any;
  mdReview?: any;
  fid: string;
}

export default function IntelligenceCardModal({
  isOpen,
  onClose,
  rawConsultationData,
  userFeedback,
  mdReview,
  fid
}: IntelligenceCardModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const cardRef = useRef<SVGSVGElement>(null);

  // Debug logging to trace data flow
  console.log('[IntelligenceCardModal] rawConsultationData:', rawConsultationData);
  console.log('[IntelligenceCardModal] responses:', rawConsultationData?.responses);
  console.log('[IntelligenceCardModal] responses length:', rawConsultationData?.responses?.length);

  // Generate card data from consultation
  const cardData: IntelligenceCardData = useMemo(() => {
    return mapConsultationToCardData(rawConsultationData, userFeedback, mdReview);
  }, [rawConsultationData, userFeedback, mdReview]);

  const tierConfig = getTierConfig(cardData.tier);

  // Reset status when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShareStatus('idle');
      setSaveStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  // Share card link
  const shareCard = async () => {
    setIsSharing(true);
    setShareStatus('idle');
    setErrorMessage('');

    try {
      // Create share record
      const shareResponse = await fetch('/api/share-intelligence-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: cardData.caseId,
          fid,
          tier: cardData.tier,
          consensusPercentage: cardData.consensusPercentage,
          participatingCount: cardData.participatingCount,
          totalStake: cardData.totalStake,
          primaryPrediction: cardData.primaryPrediction.text
        })
      });

      let shareUrl = `https://orthoiq.app/track/${cardData.caseId}`;

      if (shareResponse.ok) {
        const shareData = await shareResponse.json();
        shareUrl = shareData.shareUrl || shareUrl;
      }

      const shareText = `🧠 OrthoIQ Intelligence Card\n\n📊 ${cardData.participatingCount} AI Specialists • ${cardData.consensusPercentage}% Consensus\n💰 ${cardData.totalStake.toFixed(1)} tokens staked\n🎯 ${tierConfig.label} Tier\n\n${cardData.primaryPrediction.text}`;

      const webShareData = {
        title: 'OrthoIQ Intelligence Card',
        text: shareText,
        url: shareUrl
      };

      // Use Web Share API if available
      if (navigator.share && navigator.canShare && navigator.canShare(webShareData)) {
        try {
          await navigator.share(webShareData);
          setShareStatus('success');
        } catch {
          // User cancelled, fallback to clipboard
          await copyToClipboard(shareUrl);
        }
      } else {
        await copyToClipboard(shareUrl);
      }
    } catch (error) {
      console.error('Share error:', error);
      setShareStatus('error');
      setErrorMessage('Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareStatus('success');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShareStatus('success');
      }
    } catch {
      setShareStatus('error');
      setErrorMessage('Failed to copy link');
    }
  };

  // Save card as image
  const saveAsImage = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const svgElement = document.querySelector('.intelligence-card') as SVGSVGElement;
      if (!svgElement) {
        throw new Error('Card not found');
      }

      // Clone SVG for export
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      // Convert SVG to PNG using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = async () => {
        canvas.width = 450 * 2; // 2x for retina
        canvas.height = 600 * 2;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(svgUrl);

        // Convert to PNG blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setSaveStatus('error');
            setErrorMessage('Failed to generate image');
            setIsSaving(false);
            return;
          }

          try {
            const fileName = `OrthoIQ-Intelligence-Card-${cardData.caseId}.png`;

            // Try native share/save for mobile
            if (navigator.share && navigator.canShare) {
              const file = new File([blob], fileName, { type: 'image/png' });
              const shareData = { files: [file] };

              if (navigator.canShare(shareData)) {
                await navigator.share(shareData);
                setSaveStatus('success');
                setIsSaving(false);
                setTimeout(() => setSaveStatus('idle'), 3000);
                return;
              }
            }

            // Fallback to download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setSaveStatus('success');
          } catch {
            setSaveStatus('error');
            setErrorMessage('Failed to save image');
          }
          setIsSaving(false);
          setTimeout(() => setSaveStatus('idle'), 3000);
        }, 'image/png', 0.95);
      };

      img.onerror = () => {
        setSaveStatus('error');
        setErrorMessage('Failed to load image');
        setIsSaving(false);
        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setErrorMessage('Failed to save image');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tier badge */}
          <div className="absolute -top-12 left-0 flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{
                backgroundColor: tierConfig.borderColor,
                color: 'white'
              }}
            >
              {tierConfig.label} TIER
            </span>
            <span className="text-white/60 text-sm">
              Top {tierConfig.percentage}
            </span>
          </div>

          {/* Card container */}
          <div className="flex justify-center mb-6">
            <IntelligenceCard data={cardData} size="medium" animated={true} />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center">
            {/* Share button */}
            <button
              onClick={shareCard}
              disabled={isSharing}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                shareStatus === 'success'
                  ? 'bg-green-500 text-white'
                  : shareStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
              }`}
            >
              {isSharing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sharing...
                </>
              ) : shareStatus === 'success' ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Link Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Link
                </>
              )}
            </button>

            {/* Save image button */}
            <button
              onClick={saveAsImage}
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                saveStatus === 'success'
                  ? 'bg-green-500 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Save Image
                </>
              )}
            </button>
          </div>

          {/* Error message */}
          {errorMessage && (
            <p className="text-red-400 text-sm text-center mt-3">{errorMessage}</p>
          )}

          {/* Card stats summary */}
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{cardData.participatingCount}</div>
              <div className="text-xs text-white/60">Specialists</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">{cardData.consensusPercentage}%</div>
              <div className="text-xs text-white/60">Consensus</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-400">{cardData.totalStake.toFixed(1)}</div>
              <div className="text-xs text-white/60">Tokens Staked</div>
            </div>
          </div>

          {/* Tracking CTA */}
          <div className="mt-4 text-center">
            <p className="text-white/50 text-sm">
              Scan QR code or visit{' '}
              <span className="text-blue-400">orthoiq.app/track/{cardData.caseId}</span>
              {' '}to validate predictions
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
