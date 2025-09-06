'use client';

import { useState, useEffect } from 'react';
import { PaymentStatusProps } from '@/lib/types';

export default function PaymentStatus({ paymentId, onStatusUpdate }: PaymentStatusProps) {
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/payments/status/${paymentId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment status');
        }

        const data = await response.json();
        setPaymentData(data);
        onStatusUpdate(data.status);
        setError(null);
      } catch (err) {
        console.error('Error fetching payment status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    if (paymentId) {
      fetchPaymentStatus();
      
      // Poll for status updates every 30 seconds for pending payments
      const interval = setInterval(() => {
        if (paymentData?.status === 'pending' || paymentData?.status === 'processing') {
          fetchPaymentStatus();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [paymentId, paymentData?.status, onStatusUpdate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading payment status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-red-800 text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-gray-800 text-sm">No payment data found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'pending':
      case 'processing':
        return 'yellow';
      case 'failed':
        return 'red';
      case 'refunded':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'failed':
        return '❌';
      case 'refunded':
        return '↩️';
      default:
        return '❓';
    }
  };

  const color = getStatusColor(paymentData.status);
  const icon = getStatusIcon(paymentData.status);

  return (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className={`font-semibold text-${color}-900`}>
            Payment {paymentData.status.charAt(0).toUpperCase() + paymentData.status.slice(1)}
          </h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
          ${paymentData.amountUSDC.toFixed(2)} USDC
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className={`text-${color}-600`}>Payment ID:</span>
          <p className={`text-${color}-900 font-mono text-xs`}>{paymentData.paymentId}</p>
        </div>
        <div>
          <span className={`text-${color}-600`}>Prescription:</span>
          <p className={`text-${color}-900 font-mono text-xs`}>{paymentData.prescriptionId}</p>
        </div>
      </div>

      {paymentData.paymentHash && (
        <div className="text-sm mb-3">
          <span className={`text-${color}-600`}>Transaction Hash:</span>
          <p className={`text-${color}-900 font-mono text-xs break-all`}>{paymentData.paymentHash}</p>
        </div>
      )}

      <div className="text-xs">
        {paymentData.status === 'completed' && paymentData.paidAt && (
          <p className={`text-${color}-600`}>
            Paid on {new Date(paymentData.paidAt).toLocaleDateString()} at {new Date(paymentData.paidAt).toLocaleTimeString()}
          </p>
        )}
        {paymentData.status === 'pending' && (
          <p className={`text-${color}-600`}>
            Payment request created on {new Date(paymentData.requestedAt).toLocaleDateString()}
          </p>
        )}
        {paymentData.status === 'refunded' && paymentData.refundedAt && (
          <p className={`text-${color}-600`}>
            Refunded on {new Date(paymentData.refundedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {paymentData.status === 'completed' && (
        <div className={`mt-3 p-2 bg-${color}-100 rounded text-sm`}>
          <p className={`text-${color}-800`}>
            ✨ Your prescription has been added to the MD review queue and will be reviewed within 48 hours.
          </p>
        </div>
      )}
    </div>
  );
}