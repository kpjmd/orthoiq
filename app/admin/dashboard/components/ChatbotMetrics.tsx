'use client';

import { useEffect, useState } from 'react';

interface ChatbotData {
  totalConsultations: number;
  consultationsWithChat: number;
  chatEngagementRate: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  avgMessagesPerSession: number;
  avgUserMessagesPerSession: number;
  sessionDistribution: Array<{ bucket: string; count: number }>;
  sessionsLast7Days: number;
  messagesLast7Days: number;
  sessionTrend: Array<{ date: string; sessions: number }>;
  activityByHour: Array<{ hour: number; count: number }>;
  specialistContextBreakdown: Array<{ context: string; count: number }>;
}

function formatHour(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

export function ChatbotMetrics() {
  const [data, setData] = useState<ChatbotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/chatbot/metrics');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch chatbot metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-gray-500">Failed to load chatbot metrics</p>
      </div>
    );
  }

  const hasAnyData = data.consultationsWithChat > 0;
  const maxDistCount = data.sessionDistribution.length > 0
    ? Math.max(...data.sessionDistribution.map(d => d.count), 1)
    : 1;

  // Build full 24-hour array (fill missing hours with 0)
  const hourMap: Record<number, number> = {};
  for (const { hour, count } of data.activityByHour) hourMap[hour] = count;
  const allHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] || 0 }));
  const maxHour = Math.max(...allHours.map(h => h.count), 1);

  const maxTrend = data.sessionTrend.length > 0
    ? Math.max(...data.sessionTrend.map(d => d.sessions), 1)
    : 1;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">Chatbot Usage Patterns</h2>
        <p className="text-sm text-gray-500">Post-consultation chat engagement</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Top metric cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-700">
              {data.chatEngagementRate}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Chat Engagement</div>
            <div className="text-xs text-gray-400">{data.consultationsWithChat} sessions</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-indigo-700">
              {data.avgUserMessagesPerSession}
            </div>
            <div className="text-xs text-gray-600 mt-1">Avg Questions</div>
            <div className="text-xs text-gray-400">Per session</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-700">
              {data.sessionsLast7Days}
            </div>
            <div className="text-xs text-gray-600 mt-1">7-Day Sessions</div>
            <div className="text-xs text-gray-400">{data.messagesLast7Days} messages</div>
          </div>
        </div>

        {!hasAnyData ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
            No chatbot sessions recorded yet.
          </div>
        ) : (
          <>
            {/* Session depth distribution */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Session Depth</h3>
              <div className="space-y-2">
                {data.sessionDistribution.map(({ bucket, count }) => {
                  const widthPct = maxDistCount > 0 ? (count / maxDistCount) * 100 : 0;
                  return (
                    <div key={bucket}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-gray-600">{bucket}</span>
                        <span className="font-semibold text-gray-900">{count} sessions</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity by hour */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Activity by Hour (UTC)</h3>
              <div className="h-16 flex items-end space-x-px">
                {allHours.map(({ hour, count }) => {
                  const height = maxHour > 0 ? (count / maxHour) * 100 : 0;
                  return (
                    <div
                      key={hour}
                      className="flex-1 bg-blue-400 hover:bg-blue-600 rounded-t transition-colors cursor-pointer"
                      style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0' }}
                      title={`${formatHour(hour)}: ${count} messages`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>12a</span>
                <span>6a</span>
                <span>12p</span>
                <span>6p</span>
                <span>11p</span>
              </div>
            </div>

            {/* 30-day session trend */}
            {data.sessionTrend.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Session Trend (30 Days)</h3>
                <div className="h-16 flex items-end space-x-0.5">
                  {data.sessionTrend.map((day, idx) => {
                    const height = maxTrend > 0 ? (day.sessions / maxTrend) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-700 transition-colors cursor-pointer"
                        style={{ height: `${height}%`, minHeight: day.sessions > 0 ? '2px' : '0' }}
                        title={`${day.date}: ${day.sessions} sessions`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Specialist context */}
            {data.specialistContextBreakdown.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Chat Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {data.specialistContextBreakdown.map(({ context, count }) => (
                    <div key={context} className="flex items-center gap-1 bg-white border border-blue-200 rounded-full px-2 py-1">
                      <span className="text-xs text-gray-700 capitalize">{context}</span>
                      <span className="text-xs font-semibold text-blue-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
