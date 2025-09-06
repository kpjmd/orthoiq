'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminAuthProvider, useAdminAuth, AdminSignInButton } from '@/components/AdminAuthProvider';
import AdminPasswordAuth from '@/components/AdminPasswordAuth';
import Link from 'next/link';

interface QueueItem {
  id: number;
  prescription_id: string;
  payment_id: string;
  fid: string;
  priority: number;
  status: string;
  amount_usdc: string;
  paid_at: string;
  rarity_type: string;
  question: string;
  response: string;
  confidence: number;
  expires_at: string;
  created_at: string;
}

function MDReviewQueueContent() {
  const { user, isAuthenticated } = useAdminAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const passwordAuth = localStorage.getItem('admin_authenticated');
    if (passwordAuth === 'true') {
      setIsPasswordAuthenticated(true);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/md-review-queue');
      if (response.ok) {
        const data = await response.json();
        setQueue(data.queue || []);
      }
    } catch (error) {
      console.error('Failed to load MD review queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated || isPasswordAuthenticated) {
      loadQueue();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isPasswordAuthenticated, loadQueue]);

  const handleCompleteReview = async (queueId: number, mdName: string, reviewNotes?: string) => {
    setProcessingItems(prev => new Set(prev).add(queueId));
    
    try {
      const response = await fetch('/api/admin/md-review/complete', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueId,
          mdName,
          reviewNotes,
          mdSignature: `${mdName} - ${new Date().toISOString()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete review');
      }

      // Reload queue after successful completion
      await loadQueue();
    } catch (error) {
      console.error('Error completing MD review:', error);
      alert('Failed to complete review. Please try again.');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(queueId);
        return newSet;
      });
    }
  };

  const isAuthorized = isPasswordAuthenticated || (isAuthenticated && user && (
    user.username === 'kpjmd' || 
    user.displayName?.toLowerCase().includes('kpjmd') ||
    user.fid === 15230
  ));

  if (!isAuthenticated && !isPasswordAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">🔐 Admin Access Required</h1>
            <p className="text-gray-600 mb-6">Please authenticate to access the MD review queue.</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
              🟣 Primary Authentication
            </h3>
            <div className="flex justify-center">
              <AdminSignInButton />
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={() => setShowPasswordAuth(!showPasswordAuth)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {showPasswordAuth ? 'Hide' : 'Show'} backup password access
            </button>
          </div>
          
          {showPasswordAuth && (
            <AdminPasswordAuth 
              onAuthSuccess={() => {
                setIsPasswordAuthenticated(true);
                setShowPasswordAuth(false);
              }} 
            />
          )}
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">🚫 Access Denied</h1>
          <p className="text-gray-600 mb-6">You are not authorized to access this dashboard.</p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-purple-100 text-purple-800'; // Ultra-rare
      case 2: return 'bg-blue-100 text-blue-800';     // Rare
      case 3: return 'bg-green-100 text-green-800';   // Uncommon
      default: return 'bg-gray-100 text-gray-800';    // Common
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'ultra-rare': return '✨';
      case 'rare': return '⭐';
      case 'uncommon': return '💫';
      default: return '🔹';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">👨‍⚕️ MD Review Queue</h1>
            <div className="flex gap-4 items-center">
              <button
                onClick={loadQueue}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                🔄 Refresh
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back to Admin
              </Link>
            </div>
          </div>
          <p className="text-gray-600">
            Review AI-generated prescriptions that users have paid for MD review ($10 USDC each)
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-refreshes every 30 seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Queue Items: {queue.length}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
            <span className="text-gray-600">Loading review queue...</span>
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No prescriptions are currently waiting for MD review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {queue.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(item.priority)}`}>
                          {getRarityIcon(item.rarity_type)} Priority {item.priority}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">{item.rarity_type.replace('-', ' ')}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Prescription #{item.prescription_id}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>User FID: {item.fid}</span>
                          <span>Paid: ${parseFloat(item.amount_usdc).toFixed(2)} USDC</span>
                          <span>Confidence: {Math.round(item.confidence * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Paid: {new Date(item.paid_at).toLocaleDateString()}</p>
                      <p>Expires: {new Date(item.expires_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Patient Question:</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{item.question}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">AI-Generated Response:</h4>
                      <div className="text-gray-700 bg-blue-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                        {item.response.split('\n').map((line, idx) => (
                          <p key={idx} className="mb-2">{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Queue ID: {item.id} • Created: {new Date(item.created_at).toLocaleString()}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const notes = prompt("Enter review notes (optional):");
                          if (notes !== null) {
                            handleCompleteReview(item.id, "Dr. KPJMD", notes || undefined);
                          }
                        }}
                        disabled={processingItems.has(item.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                      >
                        {processingItems.has(item.id) ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>✅</span>
                            <span>Approve & Complete Review</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MDReviewQueuePage() {
  return (
    <AdminAuthProvider>
      <MDReviewQueueContent />
    </AdminAuthProvider>
  );
}