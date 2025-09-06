'use client';

import { useState } from 'react';
import { MDReviewUpgradeProps } from '@/lib/types';
import PaymentModal from './PaymentModal';

export default function MDReviewUpgrade({
  prescriptionId,
  questionId,
  fid,
  isAlreadyPaid,
  paymentStatus,
  inReviewQueue,
  isReviewed
}: MDReviewUpgradeProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState(paymentStatus);

  const handlePaymentSuccess = (paymentId: string) => {
    setCurrentPaymentStatus('completed');
    setIsPaymentModalOpen(false);
    // You could also show a success message here
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // You could show an error message here
  };

  // If already reviewed by MD, show the badge/stamp
  if (isReviewed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 font-bold text-sm">✓</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">MD Reviewed</p>
          <p className="text-xs text-green-600">This prescription has been professionally reviewed</p>
        </div>
      </div>
    );
  }

  // If payment completed and in review queue
  if (currentPaymentStatus === 'completed' && inReviewQueue) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-800">In Review Queue</p>
          <p className="text-xs text-blue-600">Your prescription is being reviewed by our MD</p>
        </div>
      </div>
    );
  }

  // If payment completed but not in queue yet (processing)
  if (currentPaymentStatus === 'completed') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-yellow-600 rounded-full animate-spin border-2 border-t-transparent"></div>
        </div>
        <div>
          <p className="text-sm font-semibold text-yellow-800">Payment Confirmed</p>
          <p className="text-xs text-yellow-600">Adding to review queue...</p>
        </div>
      </div>
    );
  }

  // If payment pending
  if (currentPaymentStatus === 'pending' || currentPaymentStatus === 'processing') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <span className="text-orange-600 text-sm">⏳</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-orange-800">Payment Pending</p>
          <p className="text-xs text-orange-600">Waiting for payment confirmation</p>
        </div>
      </div>
    );
  }

  // If payment failed or not initiated - show upgrade option
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">👨‍⚕️</span>
              </div>
              <h3 className="text-lg font-semibold text-purple-900">Upgrade to MD Review</h3>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                Premium
              </span>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              Get your AI-generated prescription professionally reviewed by a board-certified MD. 
              Add medical credibility and make it a collectible NFT.
            </p>
            <div className="flex items-center gap-4 text-xs text-purple-600 mb-3">
              <div className="flex items-center gap-1">
                <span>✓</span>
                <span>Professional medical opinion</span>
              </div>
              <div className="flex items-center gap-1">
                <span>✓</span>
                <span>NFT collectible ready</span>
              </div>
              <div className="flex items-center gap-1">
                <span>✓</span>
                <span>48-hour review</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-900 mb-1">$10</div>
            <div className="text-xs text-purple-600">USDC</div>
          </div>
        </div>
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          Request MD Review - $10 USDC
        </button>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
        <div className="flex">
          <span className="text-yellow-400 mr-2">⚠️</span>
          <div className="text-sm">
            <p className="font-medium text-yellow-800">Medical Disclaimer</p>
            <p className="text-yellow-700">
              You are purchasing a professional medical opinion on an AI-generated response, 
              not a medical diagnosis or treatment plan.
            </p>
          </div>
        </div>
      </div>

      <PaymentModal
        prescriptionId={prescriptionId}
        questionId={questionId}
        fid={fid}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  );
}