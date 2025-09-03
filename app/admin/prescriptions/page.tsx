'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminAuthProvider, useAdminAuth, AdminSignInButton } from '@/components/AdminAuthProvider';
import AdminPasswordAuth from '@/components/AdminPasswordAuth';
import Link from 'next/link';
import TimeSeriesChart from '@/components/admin/charts/TimeSeriesChart';
import RarityDistributionPie from '@/components/admin/charts/RarityDistributionPie';
import EngagementBarChart from '@/components/admin/charts/EngagementBarChart';
import PlatformShareChart from '@/components/admin/charts/PlatformShareChart';
import ViralCoefficientGauge from '@/components/admin/charts/ViralCoefficientGauge';

interface PrescriptionAnalytics {
  totalPrescriptions: number;
  rarityDistribution: Array<{rarity_type: string; count: string}>;
  totalDownloads: number;
  totalShares: number;
  platformDistribution: Array<{platform: string; count: string}>;
  mdReviewStats: {
    reviewedCount: number;
    totalCount: number;
    reviewRate: number;
  };
  paymentStats: Array<{payment_status: string; count: string; total_amount: string}>;
  topCollectors: Array<{
    fid: string;
    total_prescriptions: number;
    rarity_counts: any;
    total_downloads: number;
    total_shares: number;
  }>;
  recentActivity: Array<{
    prescription_id: string;
    fid: string;
    rarity_type: string;
    created_at: string;
    question: string;
  }>;
}

interface TimeSeriesData {
  timeSeries: Array<{
    date: string;
    prescriptions: number;
    ultra_rare_count: number;
    avg_confidence: number;
  }>;
  rarityTrends: Array<{
    date: string;
    rarity_type: string;
    count: number;
  }>;
}

interface EngagementData {
  shareMetrics: Array<{
    platform: string;
    total_shares: number;
    total_clicks: number;
    avg_clicks_per_share: number;
    unique_sharers: number;
  }>;
  viralCoefficient: number;
  engagementByRarity: Array<{
    rarity_type: string;
    avg_shares: string;
    avg_downloads: string;
    total_prescriptions: string;
  }>;
}

interface UserJourneyData {
  userRetention: Array<any>;
  prescriptionGenerationRate: {
    total_responses: number;
    responses_with_prescriptions: number;
    generation_rate: number;
  };
  topMedicalTopics: Array<{
    word: string;
    frequency: number;
  }>;
}

interface RevenueData {
  mdReviewCandidates: Array<any>;
  revenueProjection: {
    ultra_rare_candidates: number;
    rare_candidates: number;
    uncommon_candidates: number;
    potential_revenue: number;
  };
  walletConnectionRate: {
    total_farcaster_users: number;
    users_with_payments: number;
    wallet_connection_rate: number;
  };
}

function PrescriptionsDashboardContent() {
  const { user, isAuthenticated } = useAdminAuth();
  const [analytics, setAnalytics] = useState<PrescriptionAnalytics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementData | null>(null);
  const [userJourneyData, setUserJourneyData] = useState<UserJourneyData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [timeRange, setTimeRange] = useState(30);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const passwordAuth = localStorage.getItem('admin_authenticated');
    if (passwordAuth === 'true') {
      setIsPasswordAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated || isPasswordAuthenticated) {
      loadAllAnalytics();
      
      // Set up auto-refresh every 5 minutes
      const interval = setInterval(loadAllAnalytics, 5 * 60 * 1000);
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isPasswordAuthenticated, timeRange]);
  
  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshInterval]);

  const loadAllAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        analyticsRes,
        timeSeriesRes,
        engagementRes,
        userJourneyRes,
        revenueRes
      ] = await Promise.all([
        fetch('/api/admin/prescriptions/analytics'),
        fetch(`/api/admin/prescriptions/time-series?days=${timeRange}`),
        fetch('/api/admin/prescriptions/engagement-metrics'),
        fetch('/api/admin/prescriptions/user-journey'),
        fetch('/api/admin/prescriptions/revenue-projections')
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }

      if (timeSeriesRes.ok) {
        const data = await timeSeriesRes.json();
        setTimeSeriesData(data);
      }

      if (engagementRes.ok) {
        const data = await engagementRes.json();
        setEngagementData(data);
      }

      if (userJourneyRes.ok) {
        const data = await userJourneyRes.json();
        setUserJourneyData(data);
      }

      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueData(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

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
            <p className="text-gray-600 mb-6">Please authenticate to access the prescription analytics dashboard.</p>
          </div>
          
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
          <p className="text-sm text-gray-500">Authorized user: kpjmd (FID: 15230)</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prescription analytics...</p>
        </div>
      </div>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600';
      case 'uncommon': return 'text-green-600';
      case 'rare': return 'text-blue-600';
      case 'ultra-rare': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100';
      case 'uncommon': return 'bg-green-100';
      case 'rare': return 'bg-blue-100';
      case 'ultra-rare': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">💊 Prescription Analytics Dashboard</h1>
            <div className="flex gap-4 items-center">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                onClick={() => loadAllAnalytics()}
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
              <Link
                href="/admin/analytics"
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Response Analytics
              </Link>
            </div>
          </div>
          <p className="text-gray-600">
            Comprehensive real-time analytics for prescription generation, user engagement, and revenue projections
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Auto-refreshes every 5 minutes
          </div>
        </div>

        {analytics && (
          <div className="space-y-8">
            {/* Enhanced Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total Prescriptions</h3>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalPrescriptions.toLocaleString()}</p>
                  </div>
                  <div className="text-3xl">💊</div>
                </div>
                {userJourneyData && (
                  <p className="text-xs text-gray-500 mt-2">
                    Generation Rate: {userJourneyData.prescriptionGenerationRate.generation_rate.toFixed(1)}%
                  </p>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total Downloads</h3>
                    <p className="text-2xl font-bold text-blue-600">{analytics.totalDownloads.toLocaleString()}</p>
                  </div>
                  <div className="text-3xl">📥</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Avg: {analytics.totalPrescriptions > 0 ? (analytics.totalDownloads / analytics.totalPrescriptions).toFixed(1) : 0}/prescription
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total Shares</h3>
                    <p className="text-2xl font-bold text-green-600">{analytics.totalShares.toLocaleString()}</p>
                  </div>
                  <div className="text-3xl">📤</div>
                </div>
                {engagementData && (
                  <p className="text-xs text-gray-500 mt-2">
                    Viral Coeff: {engagementData.viralCoefficient.toFixed(2)}
                  </p>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">MD Review Rate</h3>
                    <p className="text-2xl font-bold text-purple-600">{analytics.mdReviewStats.reviewRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-3xl">👨‍⚕️</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {analytics.mdReviewStats.reviewedCount} of {analytics.mdReviewStats.totalCount}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Revenue Potential</h3>
                    <p className="text-2xl font-bold text-emerald-600">
                      ${revenueData?.revenueProjection?.potential_revenue?.toFixed(0) || '0'}
                    </p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {revenueData?.revenueProjection?.ultra_rare_candidates || 0} candidates
                </p>
              </div>
            </div>

            {/* Time Series Chart */}
            {timeSeriesData && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">📈 Prescription Generation Trends</h3>
                  <p className="text-sm text-gray-500">Last {timeRange} days</p>
                </div>
                <TimeSeriesChart data={timeSeriesData.timeSeries} height={350} />
              </div>
            )}

            {/* Rarity Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Rarity Distribution Pie Chart */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Rarity Distribution</h3>
                <RarityDistributionPie data={analytics.rarityDistribution} height={300} />
              </div>

              {/* Engagement by Rarity */}
              {engagementData && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Engagement by Rarity</h3>
                  <EngagementBarChart data={engagementData.engagementByRarity} height={300} />
                </div>
              )}

              {/* Viral Coefficient Gauge */}
              {engagementData && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Viral Growth Metric</h3>
                  <ViralCoefficientGauge coefficient={engagementData.viralCoefficient} height={250} />
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      Values greater than 1.0 indicate viral growth
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Platform & Engagement Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Share Distribution */}
              {engagementData && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Platform Performance</h3>
                  <PlatformShareChart data={engagementData.shareMetrics} height={300} />
                </div>
              )}

              {/* Medical Topics Word Cloud */}
              {userJourneyData && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏥 Popular Medical Topics</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {userJourneyData.topMedicalTopics.slice(0, 12).map((topic, index) => (
                      <div 
                        key={topic.word} 
                        className="flex items-center justify-between p-2 bg-blue-50 rounded text-sm"
                      >
                        <span className="font-medium text-gray-700 capitalize">{topic.word}</span>
                        <span className="text-blue-600 font-mono text-xs">{topic.frequency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Revenue Projection & MD Review Pipeline */}
            {revenueData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Revenue Projections</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">Ultra Rare</p>
                      <p className="text-2xl font-bold text-purple-800">{revenueData.revenueProjection.ultra_rare_candidates}</p>
                      <p className="text-xs text-gray-600">× $25 = ${revenueData.revenueProjection.ultra_rare_candidates * 25}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Rare</p>
                      <p className="text-2xl font-bold text-blue-800">{revenueData.revenueProjection.rare_candidates}</p>
                      <p className="text-xs text-gray-600">× $15 = ${revenueData.revenueProjection.rare_candidates * 15}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-emerald-50 rounded-lg text-center">
                    <p className="text-sm text-emerald-600 font-medium">Total Potential</p>
                    <p className="text-3xl font-bold text-emerald-800">${revenueData.revenueProjection.potential_revenue.toFixed(0)}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Crypto Integration Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Farcaster Users</span>
                      <span className="text-lg font-bold text-blue-600">{revenueData.walletConnectionRate.total_farcaster_users}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Users with Payments</span>
                      <span className="text-lg font-bold text-green-600">{revenueData.walletConnectionRate.users_with_payments}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Wallet Connection Rate</span>
                      <span className="text-lg font-bold text-purple-600">{revenueData.walletConnectionRate.wallet_connection_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Statistics */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💳 Payment Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.paymentStats.map((item) => (
                  <div key={item.payment_status} className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">{item.payment_status}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{parseInt(item.count).toLocaleString()}</p>
                    {parseFloat(item.total_amount) > 0 && (
                      <p className="text-sm text-green-600 mt-1">${parseFloat(item.total_amount).toFixed(2)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* MD Review Candidates */}
            {revenueData && revenueData.mdReviewCandidates.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">👨‍⚕️ MD Review Pipeline - High Value Candidates</h3>
                <div className="space-y-3">
                  {revenueData.mdReviewCandidates.slice(0, 10).map((candidate, index) => (
                    <div key={candidate.prescription_id} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-purple-600 text-sm font-bold">{candidate.prescription_id}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityBg(candidate.rarity_type)} ${getRarityColor(candidate.rarity_type)}`}>
                            {candidate.rarity_type.replace('-', ' ')}
                          </span>
                          <span className="text-gray-500 text-sm">FID: {candidate.fid}</span>
                          <span className="text-green-600 text-sm font-medium">Conf: {Math.round(candidate.confidence * 100)}%</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{candidate.question}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-emerald-600">${candidate.potential_value}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(candidate.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Pro Tip:</strong> Focus MD review efforts on high-confidence, rare+ prescriptions for maximum revenue impact.
                    Total pipeline value: <strong>${revenueData.revenueProjection.potential_revenue.toFixed(0)}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Top Collectors */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Collectors & Power Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 text-gray-600">User</th>
                      <th className="pb-2 text-gray-600">Total</th>
                      <th className="pb-2 text-gray-600">Common</th>
                      <th className="pb-2 text-gray-600">Uncommon</th>
                      <th className="pb-2 text-gray-600">Rare</th>
                      <th className="pb-2 text-gray-600">Ultra Rare</th>
                      <th className="pb-2 text-gray-600">Downloads</th>
                      <th className="pb-2 text-gray-600">Shares</th>
                      <th className="pb-2 text-gray-600">Collection Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topCollectors.map((collector, index) => {
                      const collectionValue = (collector.rarity_counts?.['ultra-rare'] || 0) * 25 + 
                                            (collector.rarity_counts?.rare || 0) * 15 + 
                                            (collector.rarity_counts?.uncommon || 0) * 10 + 
                                            (collector.rarity_counts?.common || 0) * 5;
                      return (
                        <tr key={collector.fid} className={`border-b ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : ''}`}>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {index < 3 && <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>}
                              <span className="font-mono text-blue-600">{collector.fid}</span>
                            </div>
                          </td>
                          <td className="py-3 font-bold">{collector.total_prescriptions}</td>
                          <td className="py-3">{collector.rarity_counts?.common || 0}</td>
                          <td className="py-3 text-green-600">{collector.rarity_counts?.uncommon || 0}</td>
                          <td className="py-3 text-blue-600">{collector.rarity_counts?.rare || 0}</td>
                          <td className="py-3 text-purple-600 font-bold">{collector.rarity_counts?.['ultra-rare'] || 0}</td>
                          <td className="py-3">{collector.total_downloads}</td>
                          <td className="py-3">{collector.total_shares}</td>
                          <td className="py-3 text-emerald-600 font-bold">${collectionValue}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity & Export */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ Recent Prescription Activity</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analytics.recentActivity.map((activity) => (
                    <div key={activity.prescription_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-blue-600 text-sm">{activity.prescription_id}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityBg(activity.rarity_type)} ${getRarityColor(activity.rarity_type)}`}>
                            {activity.rarity_type.replace('-', ' ')}
                          </span>
                          <span className="text-gray-500 text-sm">FID: {activity.fid}</span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">{activity.question}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export & Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Admin Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => loadAllAnalytics()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    🔄 Refresh All Data
                  </button>
                  
                  <button
                    onClick={() => {
                      const csvData = analytics.topCollectors.map(c => ({
                        fid: c.fid,
                        total: c.total_prescriptions,
                        common: c.rarity_counts?.common || 0,
                        uncommon: c.rarity_counts?.uncommon || 0,
                        rare: c.rarity_counts?.rare || 0,
                        ultra_rare: c.rarity_counts?.['ultra-rare'] || 0,
                        downloads: c.total_downloads,
                        shares: c.total_shares
                      }));
                      const csv = [
                        Object.keys(csvData[0]).join(','),
                        ...csvData.map(row => Object.values(row).join(','))
                      ].join('\\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `prescription-analytics-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    📊 Export Analytics
                  </button>
                  
                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-600 mb-2">Quick Stats:</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Unique Collectors:</span>
                        <span className="font-bold">{analytics.topCollectors.length}</span>
                      </div>
                      {revenueData && (
                        <div className="flex justify-between">
                          <span>Ready for Review:</span>
                          <span className="font-bold text-purple-600">{revenueData.mdReviewCandidates.length}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Ultra Rare Total:</span>
                        <span className="font-bold text-purple-600">
                          {analytics.rarityDistribution.find(r => r.rarity_type === 'ultra-rare')?.count || '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrescriptionsAnalyticsPage() {
  return (
    <AdminAuthProvider>
      <PrescriptionsDashboardContent />
    </AdminAuthProvider>
  );
}