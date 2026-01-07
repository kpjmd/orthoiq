'use client';

import { useEffect, useState } from 'react';

interface EngagementData {
  totalConsultations: number;
  week2Validations: number;
  week4Validations: number;
  week8Validations: number;
  overallValidationRate: number;
  averageVisitsPerCase: number;
  casesWithMultipleVisits: number;
  percentageReturning: number;
  week2CompletionRate: number;
  week4CompletionRate: number;
  week8CompletionRate: number;
  averageDaysToFirstValidation: number;
  dropoffAtMilestone: {
    week2: number;
    week4: number;
    week8: number;
  };
  usersWithResearchAgentAccess: number;
  usersWithWearableIntegration: number;
  premiumConversionRate: number;
  validationFunnel: Array<{ stage: string; count: number; percentage: number }>;
}

export function EngagementMetrics() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/engagement/metrics');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch engagement metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-gray-500">Failed to load engagement metrics</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">User Engagement Metrics</h2>
        <p className="text-sm text-gray-500">Retention and validation tracking</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Validation Funnel */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Validation Funnel</h3>
          <div className="space-y-3">
            {data.validationFunnel.map((stage, index) => {
              const maxCount = data.validationFunnel[0].count;
              const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-gray-700">{stage.stage}</span>
                    <span className="font-semibold text-gray-900">
                      {stage.count.toLocaleString()} ({Math.round(stage.percentage)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-6 rounded-full flex items-center justify-end px-2 transition-all"
                      style={{ width: `${widthPercent}%` }}
                    >
                      {widthPercent > 15 && (
                        <span className="text-xs font-medium text-white">
                          {Math.round(stage.percentage)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Return Visit Patterns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Avg Visits per Case</div>
            <div className="text-2xl font-bold text-gray-900">
              {data.averageVisitsPerCase.toFixed(1)}
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Cases with 2+ Visits</div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(data.percentageReturning * 100)}%
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Avg Days to First Validation</div>
            <div className="text-2xl font-bold text-gray-900">
              {typeof data.averageDaysToFirstValidation === 'string'
                ? data.averageDaysToFirstValidation
                : data.averageDaysToFirstValidation.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Milestone Completion Rates */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Milestone Completion Rates</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Week 2:</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full"
                    style={{ width: `${data.week2CompletionRate * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {Math.round(data.week2CompletionRate * 100)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Week 4:</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-purple-500 h-4 rounded-full"
                    style={{ width: `${data.week4CompletionRate * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {Math.round(data.week4CompletionRate * 100)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Week 8:</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full"
                    style={{ width: `${data.week8CompletionRate * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {Math.round(data.week8CompletionRate * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Feature Adoption */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Premium Feature Adoption</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Research Agent Access:</span>
              <span className="font-semibold text-gray-900">
                {data.usersWithResearchAgentAccess} users
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Wearable Integration:</span>
              <span className="font-semibold text-gray-900">
                {data.usersWithWearableIntegration} users
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-purple-200">
              <span className="text-gray-700 font-medium">Premium Conversion Rate:</span>
              <span className="font-bold text-purple-600">
                {data.premiumConversionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
