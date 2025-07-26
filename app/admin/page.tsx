'use client';

import { useEffect, useState } from 'react';
import { AdminAuthProvider, useAdminAuth, AdminSignInButton } from '@/components/AdminAuthProvider';
import AdminPasswordAuth from '@/components/AdminPasswordAuth';

interface PendingResponse {
  id: string;
  fid: string;
  question: string;
  response: string;
  confidence: number;
  timestamp: string;
  userTier: string;
}

interface ReviewDetails {
  reviewType: string;
  additionsText?: string;
  correctionsText?: string;
  teachingNotes?: string;
  confidenceScore?: number;
  communicationQuality?: number;
}

interface MedicalCategory {
  specialty?: string;
  complexity?: string;
  responseQuality?: string;
  commonIssues?: string[];
}

function AdminDashboardContent() {
  const { user, isAuthenticated } = useAdminAuth();
  const [pendingResponses, setPendingResponses] = useState<PendingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<PendingResponse | null>(null);
  const [reviewForm, setReviewForm] = useState<{[key: string]: ReviewDetails & MedicalCategory}>({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    format: 'jsonl',
    specialty: '',
    complexity: '',
    responseQuality: '',
    reviewType: ''
  });
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);

  useEffect(() => {
    // Check for existing password authentication
    const passwordAuth = localStorage.getItem('admin_authenticated');
    if (passwordAuth === 'true') {
      setIsPasswordAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated || isPasswordAuthenticated) {
      loadPendingResponses();
    }
  }, [isAuthenticated, isPasswordAuthenticated]);

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

  const handleEnhancedReview = async (responseId: string) => {
    const formData = reviewForm[responseId];
    if (!formData?.reviewType) {
      alert('Please select a review type');
      return;
    }

    const approved = formData.reviewType.startsWith('approve');
    
    try {
      const res = await fetch('/api/admin/review-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          approved,
          reviewerFid: user?.fid || 15230,
          reviewerName: user?.displayName || user?.username || 'Dr. KPJMD',
          notes: formData.teachingNotes || '',
          reviewDetails: {
            reviewType: formData.reviewType,
            additionsText: formData.additionsText,
            correctionsText: formData.correctionsText,
            teachingNotes: formData.teachingNotes,
            confidenceScore: formData.confidenceScore,
            communicationQuality: formData.communicationQuality
          },
          medicalCategory: {
            specialty: formData.specialty,
            complexity: formData.complexity,
            responseQuality: formData.responseQuality,
            commonIssues: formData.commonIssues
          }
        })
      });

      if (res.ok) {
        // Remove from pending list
        setPendingResponses(prev => prev.filter(r => r.id !== responseId));
        setSelectedResponse(null);
        // Clear form data
        setReviewForm(prev => {
          const newForm = {...prev};
          delete newForm[responseId];
          return newForm;
        });
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const updateReviewForm = (responseId: string, field: string, value: any) => {
    setReviewForm(prev => ({
      ...prev,
      [responseId]: {
        ...prev[responseId],
        [field]: value
      }
    }));
  };

  const handleExportTrainingData = async () => {
    try {
      // Remove empty filters
      const cleanFilters = Object.fromEntries(
        Object.entries(exportFilters).filter(([_, value]) => value !== '')
      );

      const res = await fetch('/api/admin/export-training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportFilters.format,
          filters: cleanFilters,
          exportedBy: user?.displayName || user?.username || 'KPJMD'
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`✅ Training data exported successfully!\n\nFile: ${result.file_name}\nRecords: ${result.record_count}\nFormat: ${result.format.toUpperCase()}\n\nFile saved to: ${result.file_path}`);
        setShowExportModal(false);
      } else {
        const error = await res.json();
        alert(`❌ Export failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Export failed: Network error');
    }
  };

  // Check if user is authorized (Farcaster auth OR password auth)
  const isAuthorized = isPasswordAuthenticated || (isAuthenticated && user && (
    user.username === 'kpjmd' || 
    user.displayName?.toLowerCase().includes('kpjmd') ||
    user.fid === 15230 // Your FID
  ));

  if (!isAuthenticated && !isPasswordAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">🔐 Admin Access Required</h1>
            <p className="text-gray-600 mb-6">Please authenticate to access the doctor review dashboard.</p>
          </div>
          
          {/* Farcaster Auth Option */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
              🟣 Primary Authentication
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Sign in with your Farcaster account
            </p>
            <div className="flex justify-center">
              <AdminSignInButton />
            </div>
          </div>
          
          {/* Password Auth Option */}
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">🏥 OrthoIQ Doctor Dashboard</h1>
              <p className="text-lg opacity-90">Medical Response Review System & AI Training Data</p>
              <p className="text-sm mt-2 opacity-75">
                Signed in as: {isPasswordAuthenticated ? 'Admin (Password)' : (user?.displayName || user?.username)}
              </p>
            </div>
            <div className="flex space-x-3">
              <a
                href="/admin/analytics"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                📈 Analytics
              </a>
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                📊 Export Training Data
              </button>
            </div>
          </div>
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
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">FID: {response.fid}</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {response.userTier}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(response.timestamp).toLocaleString()}</span>
                      <span className="text-xs text-gray-500">Confidence: {Math.round(response.confidence * 100)}%</span>
                    </div>
                    
                    {/* Question and Response */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
                        <p className="text-gray-900 bg-blue-50 p-3 rounded-lg">{response.question}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">AI Response:</p>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">{response.response}</p>
                      </div>
                    </div>

                    {/* Enhanced Review Interface */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">🏥 Medical Review & AI Training Data</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Review Type */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Review Decision</label>
                          <select
                            value={reviewForm[response.id]?.reviewType || ''}
                            onChange={(e) => updateReviewForm(response.id, 'reviewType', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Select...</option>
                            <option value="approve_as_is">✅ Approve as-is</option>
                            <option value="approve_with_additions">✅➕ Approve with additions</option>
                            <option value="approve_with_corrections">✅✏️ Approve with corrections</option>
                            <option value="reject_medical_inaccuracy">❌🏥 Reject - medical inaccuracy</option>
                            <option value="reject_inappropriate_scope">❌🎯 Reject - inappropriate scope</option>
                            <option value="reject_poor_communication">❌💬 Reject - poor communication</option>
                          </select>
                        </div>

                        {/* Medical Specialty */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Medical Specialty</label>
                          <select
                            value={reviewForm[response.id]?.specialty || ''}
                            onChange={(e) => updateReviewForm(response.id, 'specialty', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Select...</option>
                            <option value="shoulder">Shoulder</option>
                            <option value="knee">Knee</option>
                            <option value="spine">Spine</option>
                            <option value="hip">Hip</option>
                            <option value="foot_ankle">Foot & Ankle</option>
                            <option value="hand_wrist">Hand & Wrist</option>
                            <option value="sports_medicine">Sports Medicine</option>
                            <option value="trauma">Trauma</option>
                            <option value="pediatric_ortho">Pediatric Ortho</option>
                            <option value="general">General</option>
                          </select>
                        </div>

                        {/* Complexity */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Question Complexity</label>
                          <select
                            value={reviewForm[response.id]?.complexity || ''}
                            onChange={(e) => updateReviewForm(response.id, 'complexity', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Select...</option>
                            <option value="basic">Basic</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>
                      </div>

                      {/* Text Areas for Detailed Feedback */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Dr. KPJMD&apos;s Additions</label>
                          <textarea
                            value={reviewForm[response.id]?.additionsText || ''}
                            onChange={(e) => updateReviewForm(response.id, 'additionsText', e.target.value)}
                            placeholder="Missing information to add..."
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 h-20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Medical Corrections</label>
                          <textarea
                            value={reviewForm[response.id]?.correctionsText || ''}
                            onChange={(e) => updateReviewForm(response.id, 'correctionsText', e.target.value)}
                            placeholder="Factual corrections needed..."
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 h-20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Teaching Notes</label>
                          <textarea
                            value={reviewForm[response.id]?.teachingNotes || ''}
                            onChange={(e) => updateReviewForm(response.id, 'teachingNotes', e.target.value)}
                            placeholder="What the AI should learn..."
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 h-20"
                          />
                        </div>
                      </div>

                      {/* Quality Scores */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Confidence Score: {reviewForm[response.id]?.confidenceScore || 5}/10
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={reviewForm[response.id]?.confidenceScore || 5}
                            onChange={(e) => updateReviewForm(response.id, 'confidenceScore', parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Communication Quality: {reviewForm[response.id]?.communicationQuality || 5}/10
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={reviewForm[response.id]?.communicationQuality || 5}
                            onChange={(e) => updateReviewForm(response.id, 'communicationQuality', parseInt(e.target.value))}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Response Quality</label>
                          <select
                            value={reviewForm[response.id]?.responseQuality || ''}
                            onChange={(e) => updateReviewForm(response.id, 'responseQuality', e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Select...</option>
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="needs_work">Needs Work</option>
                            <option value="poor">Poor</option>
                          </select>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleEnhancedReview(response.id)}
                          disabled={!reviewForm[response.id]?.reviewType}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
                        >
                          🚀 Submit Review & Training Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export Training Data Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">📊 Export AI Training Data</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
                  <select
                    value={exportFilters.format}
                    onChange={(e) => setExportFilters(prev => ({...prev, format: e.target.value}))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="jsonl">JSONL (for LoRA/PEFT training)</option>
                    <option value="csv">CSV (for analysis)</option>
                    <option value="json">JSON (detailed format)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Specialty</label>
                  <select
                    value={exportFilters.specialty}
                    onChange={(e) => setExportFilters(prev => ({...prev, specialty: e.target.value}))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All Specialties</option>
                    <option value="shoulder">Shoulder</option>
                    <option value="knee">Knee</option>
                    <option value="spine">Spine</option>
                    <option value="hip">Hip</option>
                    <option value="foot_ankle">Foot & Ankle</option>
                    <option value="hand_wrist">Hand & Wrist</option>
                    <option value="sports_medicine">Sports Medicine</option>
                    <option value="trauma">Trauma</option>
                    <option value="pediatric_ortho">Pediatric Ortho</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Complexity Level</label>
                  <select
                    value={exportFilters.complexity}
                    onChange={(e) => setExportFilters(prev => ({...prev, complexity: e.target.value}))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All Complexity Levels</option>
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Review Type</label>
                  <select
                    value={exportFilters.reviewType}
                    onChange={(e) => setExportFilters(prev => ({...prev, reviewType: e.target.value}))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All Review Types</option>
                    <option value="approve_as_is">✅ Approved as-is</option>
                    <option value="approve_with_additions">✅➕ Approved with additions</option>
                    <option value="approve_with_corrections">✅✏️ Approved with corrections</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Response Quality</label>
                  <select
                    value={exportFilters.responseQuality}
                    onChange={(e) => setExportFilters(prev => ({...prev, responseQuality: e.target.value}))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All Quality Levels</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="needs_work">Needs Work</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleExportTrainingData}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  🚀 Export Data
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminAuthProvider>
      <AdminDashboardContent />
    </AdminAuthProvider>
  );
}