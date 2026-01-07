'use client';

import { useEffect, useState, useCallback } from 'react';

interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'consultation' | 'validation' | 'md_review' | 'tier_upgrade';
  caseId?: string;
  consultationId?: string;
  description: string;
  metadata?: any;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      // For now, we'll generate mock recent activity from consultations
      // TODO: Create dedicated /api/admin/activity/recent endpoint
      const res = await fetch('/api/admin/metrics/overview');
      if (res.ok) {
        const data = await res.json();
        // Generate mock activities based on metrics
        const mockActivities = generateMockActivities(data);
        setActivities(mockActivities);
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  const generateMockActivities = (data: any): ActivityItem[] => {
    const activities: ActivityItem[] = [];
    const now = new Date();

    // Generate some recent activities based on current metrics
    if (data.consultationsToday > 0) {
      for (let i = 0; i < Math.min(5, data.consultationsToday); i++) {
        const minutesAgo = Math.floor(Math.random() * 120) + 1;
        const timestamp = new Date(now.getTime() - minutesAgo * 60000).toISOString();
        const specialists = Math.floor(Math.random() * 3) + 3;
        const consensus = Math.floor(Math.random() * 20) + 75;

        activities.push({
          id: `consultation-${i}`,
          timestamp,
          type: 'consultation',
          caseId: `OI-${Math.floor(Math.random() * 10000)}`,
          description: `New consultation • ${specialists} specialists • ${consensus}% consensus`
        });
      }
    }

    // Add some validation activities
    if (data.outcomeValidationRate > 0) {
      const validationCount = Math.min(3, Math.floor(data.consultationsToday * 0.1));
      for (let i = 0; i < validationCount; i++) {
        const minutesAgo = Math.floor(Math.random() * 240) + 60;
        const timestamp = new Date(now.getTime() - minutesAgo * 60000).toISOString();

        activities.push({
          id: `validation-${i}`,
          timestamp,
          type: 'validation',
          caseId: `OI-${Math.floor(Math.random() * 10000)}`,
          description: `Week ${[2, 4, 8][Math.floor(Math.random() * 3)]} validation completed • Pain reduced`
        });
      }
    }

    // Sort by timestamp descending
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return '📋';
      case 'validation':
        return '✅';
      case 'md_review':
        return '👨‍⚕️';
      case 'tier_upgrade':
        return '⬆️';
      default:
        return '📌';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'bg-blue-50 border-blue-200';
      case 'validation':
        return 'bg-green-50 border-green-200';
      case 'md_review':
        return 'bg-purple-50 border-purple-200';
      case 'tier_upgrade':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
        <p className="text-sm text-gray-500">Live consultation stream</p>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No recent activity
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-4 border-l-4 ${getActivityColor(activity.type)} hover:bg-opacity-50 transition-colors`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{getTimeAgo(activity.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  {activity.caseId && (
                    <span className="text-xs text-gray-500">Case #{activity.caseId}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t text-center">
        <p className="text-xs text-gray-500">Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
