'use client';

import { useState, useEffect } from 'react';
import { PaymentModalProps, WalletConnectionState } from '@/lib/types';
import WalletConnection from './WalletConnection';

export default function PaymentModal({
  prescriptionId,
  questionId,
  fid,
  isOpen,
  onClose,
  onPaymentSuccess,
  onPaymentError
}: PaymentModalProps) {
  const [paymentStep, setPaymentStep] = useState<'connect' | 'confirm' | 'processing' | 'success' | 'error'>('connect');
  const [walletState, setWalletState] = useState<WalletConnectionState>({
    isConnected: false,
    isConnecting: false
  });
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentStep('connect');
      setPaymentId(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleCreatePaymentRequest = async () => {
    try {
      const response = await fetch('/api/payments/request-md-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prescriptionId,
          fid,
          amountUSDC: 10.00
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment request');
      }

      setPaymentId(data.paymentId);
      setPaymentStep('confirm');
    } catch (error) {
      console.error('Error creating payment request:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create payment request');
      setPaymentStep('error');
    }
  };

  const handlePaymentConfirmation = async () => {
    if (!paymentId) return;

    setPaymentStep('processing');

    try {
      // In a real implementation, this would integrate with Base Pay or Farcaster payment
      // For now, we'll simulate the payment process
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate payment processing

      // Simulate payment success (in real implementation, this would be handled by payment webhook)
      const response = await fetch('/api/payments/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          status: 'completed',
          paymentHash: `0x${Math.random().toString(16).substring(2, 66)}`, // Mock hash
          walletAddress: walletState.address
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setPaymentStep('success');
      setTimeout(() => {
        onPaymentSuccess(paymentId);
      }, 1500);

    } catch (error) {
      console.error('Error processing payment:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Payment processing failed');
      setPaymentStep('error');
    }
  };

  const handleWalletConnected = (state: WalletConnectionState) => {
    setWalletState(state);
    if (state.isConnected) {
      handleCreatePaymentRequest();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">MD Review Payment</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Payment Steps */}
          {paymentStep === 'connect' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👨‍⚕️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
                <p className="text-gray-600 mb-4">
                  Connect your wallet to pay $10 USDC for professional MD review
                </p>
              </div>
              <WalletConnection 
                onWalletStateChange={handleWalletConnected}
                requiredAmount={10}
              />
            </div>
          )}

          {paymentStep === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💳</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Payment</h3>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-semibold">MD Review</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">$10.00 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prescription ID:</span>
                  <span className="font-mono text-sm">{prescriptionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Review Time:</span>
                  <span className="font-semibold">Within 48 hours</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Important:</span> You are purchasing a professional 
                  medical opinion on an AI-generated response, not a medical diagnosis.
                </p>
              </div>

              <button
                onClick={handlePaymentConfirmation}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Confirm Payment - $10 USDC
              </button>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h3>
              <p className="text-gray-600">
                Please confirm the transaction in your wallet...
              </p>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-green-600">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-4">
                Your prescription has been added to the MD review queue.
              </p>
              <p className="text-sm text-gray-500">
                You will be notified when the review is complete.
              </p>
            </div>
          )}

          {paymentStep === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-red-600">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Failed</h3>
              <p className="text-red-600 mb-4">{errorMessage}</p>
              <div className="space-y-2">
                <button
                  onClick={() => setPaymentStep('connect')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}