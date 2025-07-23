'use client';

import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthProvider';

interface PendingResponse {
  id: string;
  fid: string;
  question: string;
  response: string;
  confidence: number;
  timestamp: string;
  userTier: string;
}

function AdminDashboardContent() {
  const { user, isAuthenticated } = useAuth();
  const [pendingResponses, setPendingResponses] = useState<PendingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<PendingResponse | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadPendingResponses();
    }
  }, [isAuthenticated]);

  const loadPendingResponses = async () => {
    try {
      const res = await fetch('/api/admin/pending-responses');
      if (res.ok) {
        const data = await res.json();
        setPendingResponses(data.responses || []);
      }
    } catch (error) {
      console.error('Failed to load pending responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (responseId: string, approved: boolean, notes?: string) => {
    try {
      const res = await fetch('/api/admin/review-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          approved,
          reviewerFid: user?.fid,
          reviewerName: user?.displayName || user?.username || 'KPJMD',
          notes
        })
      });

      if (res.ok) {
        // Remove from pending list
        setPendingResponses(prev => prev.filter(r => r.id !== responseId));
        setSelectedResponse(null);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  // Check if user is authorized (this would be enhanced with proper role checking)
  const isAuthorized = isAuthenticated && user && (
    user.username === 'kpjmd' || 
    user.displayName?.toLowerCase().includes('kpjmd') ||
    user.fid === 15230 // Your FID
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">🔐 Admin Access Required</h1>
          <p className="text-gray-600 mb-6">Please sign in with Farcaster to access the doctor review dashboard.</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">🚫 Unauthorized</h1>
          <p className="text-gray-600 mb-6">Only authorized medical professionals can access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🏥 OrthoIQ Doctor Dashboard</h1>
          <p className="text-lg opacity-90">Medical Response Review System</p>
          <p className="text-sm mt-2 opacity-75">Signed in as: {user?.displayName || user?.username}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-lg">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pendingResponses.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Confidence</p>
                <p className="text-2xl font-bold text-gray-900">87%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Responses */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Pending Medical Reviews</h2>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading pending responses...</p>
            </div>
          ) : pendingResponses.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">🎉 No pending responses! All caught up.</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingResponses.map((response) => (
                <div key={response.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">FID: {response.fid}</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {response.userTier}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(response.timestamp).toLocaleString()}</span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Question:</p>
                        <p className="text-gray-900">{response.question}</p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">AI Response:</p>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{response.response}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Confidence: {Math.round(response.confidence * 100)}%</span>
                      </div>
                    </div>
                    
                    <div className="ml-6 flex-shrink-0">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproval(response.id, true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleApproval(response.id, false)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          ❌ Reject
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
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AuthProvider>
      <AdminDashboardContent />
    </AuthProvider>
  );
}