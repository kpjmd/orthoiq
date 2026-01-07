'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { AdminAuthProvider, useAdminAuth, AdminSignInButton } from '@/components/AdminAuthProvider';
import AdminPasswordAuth from '@/components/AdminPasswordAuth';
import Link from 'next/link';
import { ConsultationReview } from './ConsultationReview';
import { useSearchParams } from 'next/navigation';

interface QueueItem {
  consultationId: string;
  caseId: string;
  questionId: string;
  fid: string;
  mode: string;
  submittedAt: string;
  userQuestion: string;
  aiResponse: string;
  participatingAgents: number;
  consensus: number;
  confidence: number;
  currentTier: string;
  potentialTier: string;
  urgencyLevel: 'routine' | 'semi-urgent' | 'urgent';
  userSatisfaction?: number;
  outcomeSuccess?: boolean;
}

function MDReviewQueueContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const searchParams = useSearchParams();
  const consultationId = searchParams.get('consultationId');

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const passwordAuth = localStorage.getItem('admin_authenticated');
    if (passwordAuth === 'true') {
      setIsPasswordAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use the consultation-based queue endpoint (same as dashboard)
      const response = await fetch('/api/admin/md-review/queue');
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

  const handleCompleteReview = async (consultationId: string, mdName: string, reviewNotes?: string) => {
    setProcessingItems(prev => new Set(prev).add(consultationId));

    // Optimistic UI update - remove item immediately
    setQueue(prev => prev.filter(item => item.consultationId !== consultationId));

    try {
      const response = await fetch('/api/admin/md-review/complete', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultationId,
          mdName,
          reviewNotes,
          mdSignature: `${mdName} - ${new Date().toISOString()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete review');
      }

      // Delayed refresh to ensure DB consistency
      setTimeout(() => loadQueue(), 500);
    } catch (error) {
      console.error('Error completing MD review:', error);
      alert('Failed to complete review. Please try again.');
      // On error, reload queue to restore actual state
      await loadQueue();
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(consultationId);
        return newSet;
      });
    }
  };

  const isAuthorized = isPasswordAuthenticated || (isAuthenticated && user && (
    user.username === 'kpjmd' ||
    user.displayName?.toLowerCase().includes('kpjmd') ||
    user.fid === 15230
  ));

  // Show loading while checking auth
  if (authLoading || checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

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

  // If consultationId is provided, show consultation review interface
  if (consultationId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-purple-900 to-purple-600 text-white p-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">🏥 MD Consultation Review</h1>
            <p className="text-lg opacity-90">Agent-based consultation review system</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <ConsultationReview />
        </div>
      </div>
    );
  }

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
                href="/admin/dashboard"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
          <p className="text-gray-600">
            Review AI-generated responses and consultations pending MD verification
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
            <p className="text-gray-600">No consultations are currently waiting for MD review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {queue.map((item) => (
              <div key={item.consultationId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          item.urgencyLevel === 'urgent' ? 'bg-red-100 text-red-800' :
                          item.urgencyLevel === 'semi-urgent' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.urgencyLevel === 'urgent' ? '🔴' : item.urgencyLevel === 'semi-urgent' ? '🟡' : '🟢'} {item.urgencyLevel}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">{item.currentTier} → {item.potentialTier}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Case #{item.caseId?.slice(0, 8) || item.consultationId.slice(0, 8)}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>FID: {item.fid}</span>
                          <span>{item.participatingAgents} specialists</span>
                          <span>Consensus: {Math.round(item.consensus * 100)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p suppressHydrationWarning>Submitted: {new Date(item.submittedAt).toLocaleDateString()}</p>
                      <p>Mode: {item.mode}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Patient Question:</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{item.userQuestion}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">AI-Generated Response:</h4>
                      <div className="text-gray-700 bg-blue-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                        {item.aiResponse?.split('\n').map((line, idx) => (
                          <p key={idx} className="mb-2">{line}</p>
                        )) || <p>Response not available</p>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-500" suppressHydrationWarning>
                      ID: {item.consultationId.slice(0, 12)}... • Created: {new Date(item.submittedAt).toLocaleString()}
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href={`/admin/md-review?consultationId=${item.consultationId}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        📋 Detailed Review
                      </Link>
                      <button
                        onClick={() => {
                          const notes = prompt("Enter review notes (optional):");
                          if (notes !== null) {
                            handleCompleteReview(item.consultationId, "Dr. KPJMD", notes || undefined);
                          }
                        }}
                        disabled={processingItems.has(item.consultationId)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                      >
                        {processingItems.has(item.consultationId) ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>✅</span>
                            <span>Quick Approve</span>
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
      <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
        <MDReviewQueueContent />
      </Suspense>
    </AdminAuthProvider>
  );
}