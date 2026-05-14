'use client';

import { SystemOverview } from './components/SystemOverview';
import { EngagementMetrics } from './components/EngagementMetrics';
import { MDReviewQueue } from './components/MDReviewQueue';
import { RecentActivity } from './components/RecentActivity';
import { QueueAlert } from './components/QueueAlert';
import { PROMISMetrics } from './components/PROMISMetrics';
import { ResearchAgentMetrics } from './components/ResearchAgentMetrics';
import { ChatbotMetrics } from './components/ChatbotMetrics';
import { QueryTypeAnalytics } from './components/QueryTypeAnalytics';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">OrthoIQ Admin Dashboard</h1>
              <p className="text-lg opacity-90">Agent Performance Analytics</p>
            </div>
            <div className="flex space-x-3">
              <a
                href="/admin/md-review"
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors text-sm"
              >
                MD Review
              </a>
            </div>
          </div>
          <QueueAlert />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* System Overview */}
        <SystemOverview />

        {/* Query Pathway Analytics */}
        <QueryTypeAnalytics />

        {/* PROMIS Capture Rates & Chatbot Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PROMISMetrics />
          <ChatbotMetrics />
        </div>

        {/* Research Agent Performance */}
        <ResearchAgentMetrics />

        {/* Engagement Metrics */}
        <EngagementMetrics />

        {/* MD Review Queue & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MDReviewQueue />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
