'use client';

import { useEffect, useState } from 'react';
import { AdminAuthProvider, useAdminAuth, AdminSignInButton } from '@/components/AdminAuthProvider';
import AdminPasswordAuth from '@/components/AdminPasswordAuth';
import Link from 'next/link';

interface AnalyticsData {
  totalReviewed: number;
  approvalRate: number;
  reviewTypeDistribution: Array<{review_type: string; count: string}>;
  specialtyDistribution: Array<{specialty: string; count: string}>;
  qualityDistribution: Array<{response_quality: string; count: string}>;
  avgConfidenceScore: number;
  avgCommunicationQuality: number;
  userFeedbackStats?: {
    totalFeedback: number;
    helpfulYes: number;
    helpfulNo: number;
    helpfulSomewhat: number;
    aiRefusalCount: number;
    suggestionsCount: number;
    helpfulnessRate: number;
  };
  feedbackByDay?: Array<{date: string; feedback_count: string; helpful_yes: string; helpful_no: string}>;
}

function AnalyticsDashboardContent() {
  const { user, isAuthenticated } = useAdminAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      loadAnalytics();
    }
  }, [isAuthenticated, isPasswordAuthenticated]);

  const loadAnalytics = async () => {
    try {
      console.log('Loading analytics...');
      const res = await fetch('/api/admin/enhanced-analytics');
      
      if (res.ok) {
        const data = await res.json();
        console.log('Analytics loaded successfully:', data);
        setAnalytics(data);
      } else {
        const errorData = await res.json();
        console.error('Analytics API error:', errorData);
        
        // Set fallback data
        setAnalytics({
          totalReviewed: 0,
          approvalRate: 0,
          reviewTypeDistribution: [],
          specialtyDistribution: [],
          qualityDistribution: [],
          avgConfidenceScore: 0,
          avgCommunicationQuality: 0,
          userFeedbackStats: {
            totalFeedback: 0,
            helpfulYes: 0,
            helpfulNo: 0,
            helpfulSomewhat: 0,
            aiRefusalCount: 0,
            suggestionsCount: 0,
            helpfulnessRate: 0
          },
          feedbackByDay: []
        });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      
      // Set fallback data even on network error
      setAnalytics({
        totalReviewed: 0,
        approvalRate: 0,
        reviewTypeDistribution: [],
        specialtyDistribution: [],
        qualityDistribution: [],
        avgConfidenceScore: 0,
        avgCommunicationQuality: 0,
        userFeedbackStats: {
          totalFeedback: 0,
          helpfulYes: 0,
          helpfulNo: 0,
          helpfulSomewhat: 0,
          aiRefusalCount: 0,
          suggestionsCount: 0,
          helpfulnessRate: 0
        },
        feedbackByDay: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is authorized (Farcaster auth OR password auth)
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
            <p className="text-gray-600 mb-6">Please authenticate to access the analytics dashboard.</p>
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
      <div className="bg-gradient-to-br from-purple-900 to-purple-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">📊 OrthoIQ Analytics Dashboard</h1>
              <p className="text-lg opacity-90">AI Performance Metrics & Training Data Insights</p>
              <p className="text-sm mt-2 opacity-75">
                Signed in as: {isPasswordAuthenticated ? 'Admin (Password)' : (user?.displayName || user?.username)}
              </p>
            </div>
            <div>
              <Link 
                href="/admin"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                ← Back to Reviews
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📋</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Reviewed</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalReviewed}</p>
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
                    <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.approvalRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">🎯</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.avgConfidenceScore.toFixed(1)}/10</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-lg">💬</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Communication</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.avgCommunicationQuality.toFixed(1)}/10</p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Feedback Metrics */}
            {analytics.userFeedbackStats && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 User Feedback (RLHF Data)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 text-lg">💭</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.userFeedbackStats.totalFeedback}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-green-600 text-lg">👍</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Helpfulness Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.userFeedbackStats.helpfulnessRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-red-600 text-lg">🚫</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">AI Refusals</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.userFeedbackStats.aiRefusalCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <span className="text-yellow-600 text-lg">💡</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Suggestions</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.userFeedbackStats.suggestionsCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">👍</div>
                    <div className="text-lg font-bold text-gray-900">{analytics.userFeedbackStats.helpfulYes}</div>
                    <div className="text-sm text-gray-600">Helpful</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🤔</div>
                    <div className="text-lg font-bold text-gray-900">{analytics.userFeedbackStats.helpfulSomewhat}</div>
                    <div className="text-sm text-gray-600">Somewhat</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">👎</div>
                    <div className="text-lg font-bold text-gray-900">{analytics.userFeedbackStats.helpfulNo}</div>
                    <div className="text-sm text-gray-600">Not Helpful</div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-blue-700">
                    📊 This feedback data is automatically collected from users and helps identify responses that need improvement for RLHF training.
                  </p>
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Review Type Distribution */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Type Distribution</h3>
                <div className="space-y-3">
                  {analytics.reviewTypeDistribution.map((item, index) => {
                    const percentage = analytics.totalReviewed > 0 ? 
                      (parseInt(item.count) / analytics.totalReviewed * 100) : 0;
                    
                    const getIcon = (type: string) => {
                      if (type === 'approve_as_is') return '✅';
                      if (type === 'approve_with_additions') return '✅➕';
                      if (type === 'approve_with_corrections') return '✅✏️';
                      if (type === 'reject_medical_inaccuracy') return '❌🏥';
                      if (type === 'reject_inappropriate_scope') return '❌🎯';
                      if (type === 'reject_poor_communication') return '❌💬';
                      return '📊';
                    };

                    const getLabel = (type: string) => {
                      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    };

                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>{getIcon(item.review_type)}</span>
                          <span className="text-sm text-gray-700">{getLabel(item.review_type)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{width: `${percentage}%`}}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8">{item.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Medical Specialty Distribution */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Specialty Distribution</h3>
                <div className="space-y-3">
                  {analytics.specialtyDistribution.map((item, index) => {
                    const total = analytics.specialtyDistribution.reduce((sum, s) => sum + parseInt(s.count), 0);
                    const percentage = total > 0 ? (parseInt(item.count) / total * 100) : 0;
                    
                    const getSpecialtyIcon = (specialty: string) => {
                      const icons: {[key: string]: string} = {
                        'shoulder': '🦾',
                        'knee': '🦵',
                        'spine': '🦴',
                        'hip': '🦴',
                        'foot_ankle': '🦶',
                        'hand_wrist': '✋',
                        'sports_medicine': '⚽',
                        'trauma': '🚑',
                        'pediatric_ortho': '👶',
                        'general': '🏥'
                      };
                      return icons[specialty] || '🏥';
                    };

                    const getSpecialtyLabel = (specialty: string) => {
                      return specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    };

                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>{getSpecialtyIcon(item.specialty)}</span>
                          <span className="text-sm text-gray-700">{getSpecialtyLabel(item.specialty)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{width: `${percentage}%`}}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8">{item.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Response Quality Chart */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Quality Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {analytics.qualityDistribution.map((item, index) => {
                  const total = analytics.qualityDistribution.reduce((sum, q) => sum + parseInt(q.count), 0);
                  const percentage = total > 0 ? (parseInt(item.count) / total * 100) : 0;
                  
                  const getQualityColor = (quality: string) => {
                    const colors: {[key: string]: {bg: string, border: string}} = {
                      'excellent': {bg: 'bg-green-100', border: 'border-green-500'},
                      'good': {bg: 'bg-blue-100', border: 'border-blue-500'},
                      'needs_work': {bg: 'bg-yellow-100', border: 'border-yellow-500'},
                      'poor': {bg: 'bg-red-100', border: 'border-red-500'}
                    };
                    return colors[quality] || {bg: 'bg-gray-100', border: 'border-gray-500'};
                  };

                  const getQualityIcon = (quality: string) => {
                    const icons: {[key: string]: string} = {
                      'excellent': '🌟',
                      'good': '👍',
                      'needs_work': '🔧',
                      'poor': '❗'
                    };
                    return icons[quality] || '📊';
                  };

                  const colors = getQualityColor(item.response_quality);

                  return (
                    <div key={index} className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 text-center`}>
                      <div className="text-2xl mb-2">{getQualityIcon(item.response_quality)}</div>
                      <div className="text-lg font-bold text-gray-900">{item.count}</div>
                      <div className="text-sm text-gray-600 capitalize">{item.response_quality.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Training Data Insights */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Training Data Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Dataset Quality</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• {analytics.totalReviewed} total reviewed responses</li>
                    <li>• {(analytics.approvalRate).toFixed(1)}% approval rate (high-quality training data)</li>
                    <li>• Average confidence score: {analytics.avgConfidenceScore.toFixed(1)}/10</li>
                    <li>• Average communication quality: {analytics.avgCommunicationQuality.toFixed(1)}/10</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">LoRA/PEFT Readiness</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Structured instruction-response pairs ✅</li>
                    <li>• Medical corrections incorporated ✅</li>
                    <li>• Doctor additions included ✅</li>
                    <li>• Categorized by specialty & complexity ✅</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No analytics data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  return (
    <AdminAuthProvider>
      <AnalyticsDashboardContent />
    </AdminAuthProvider>
  );
}