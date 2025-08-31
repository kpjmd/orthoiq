'use client';

import { useEffect, useState } from 'react';
import { AdminAuthProvider, useAdminAuth, AdminSignInButton } from '@/components/AdminAuthProvider';
import AdminPasswordAuth from '@/components/AdminPasswordAuth';
import Link from 'next/link';

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

function PrescriptionsDashboardContent() {
  const { user, isAuthenticated } = useAdminAuth();
  const [analytics, setAnalytics] = useState<PrescriptionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);

  useEffect(() => {
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
      const res = await fetch('/api/admin/prescriptions/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load prescription analytics:', error);
    } finally {
      setIsLoading(false);
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
            <h1 className="text-3xl font-bold text-gray-900">💊 Prescription Analytics</h1>
            <div className="flex gap-4">
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
            Comprehensive analytics for prescription generation, collections, and engagement
          </p>
        </div>

        {analytics && (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Prescriptions</h3>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalPrescriptions.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Downloads</h3>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalDownloads.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Shares</h3>
                <p className="text-3xl font-bold text-green-600">{analytics.totalShares.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">MD Review Rate</h3>
                <p className="text-3xl font-bold text-purple-600">{analytics.mdReviewStats.reviewRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  {analytics.mdReviewStats.reviewedCount} of {analytics.mdReviewStats.totalCount}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Rarity Distribution */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rarity Distribution</h3>
                <div className="space-y-3">
                  {analytics.rarityDistribution.map((item) => (
                    <div key={item.rarity_type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getRarityBg(item.rarity_type)}`}></div>
                        <span className={`font-medium capitalize ${getRarityColor(item.rarity_type)}`}>
                          {item.rarity_type.replace('-', ' ')}
                        </span>
                      </div>
                      <span className="text-gray-600 font-mono">{parseInt(item.count).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Distribution */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Platform Distribution</h3>
                <div className="space-y-3">
                  {analytics.platformDistribution.map((item) => (
                    <div key={item.platform} className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 capitalize">
                        {item.platform.replace('_', ' ')}
                      </span>
                      <span className="text-gray-600 font-mono">{parseInt(item.count).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Statistics */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Statistics</h3>
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

            {/* Top Collectors */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Collectors</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 text-gray-600">FID</th>
                      <th className="pb-2 text-gray-600">Total</th>
                      <th className="pb-2 text-gray-600">Common</th>
                      <th className="pb-2 text-gray-600">Uncommon</th>
                      <th className="pb-2 text-gray-600">Rare</th>
                      <th className="pb-2 text-gray-600">Ultra Rare</th>
                      <th className="pb-2 text-gray-600">Downloads</th>
                      <th className="pb-2 text-gray-600">Shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topCollectors.map((collector, index) => (
                      <tr key={collector.fid} className="border-b">
                        <td className="py-2 font-mono text-blue-600">{collector.fid}</td>
                        <td className="py-2 font-bold">{collector.total_prescriptions}</td>
                        <td className="py-2">{collector.rarity_counts?.common || 0}</td>
                        <td className="py-2 text-green-600">{collector.rarity_counts?.uncommon || 0}</td>
                        <td className="py-2 text-blue-600">{collector.rarity_counts?.rare || 0}</td>
                        <td className="py-2 text-purple-600">{collector.rarity_counts?.['ultra-rare'] || 0}</td>
                        <td className="py-2">{collector.total_downloads}</td>
                        <td className="py-2">{collector.total_shares}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Prescription Activity</h3>
              <div className="space-y-3">
                {analytics.recentActivity.map((activity) => (
                  <div key={activity.prescription_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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