'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PendingConsultation {
  consultationId: string;
  caseId: string;
  submittedAt: string;
  userQuestion: string;
  specialistCount: number;
  consensus: number;
  tier: string;
  userSatisfaction?: number;
}

export function MDReviewQueue() {
  const [queue, setQueue] = useState<PendingConsultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high_consensus' | 'new'>('all');

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/admin/md-review/queue');
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (error) {
      console.error('Failed to fetch MD review queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredQueue = () => {
    let filtered = [...queue];

    switch (filter) {
      case 'urgent':
        // Sort by oldest first
        filtered.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
        break;
      case 'high_consensus':
        // Sort by highest consensus
        filtered.sort((a, b) => (b.consensus || 0) - (a.consensus || 0));
        break;
      case 'new':
        // Sort by newest first
        filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        break;
      default:
        // All - sort by oldest first
        filtered.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    }

    return filtered.slice(0, 10); // Show top 10
  };

  const getTimeSinceCreated = (submittedAt: string) => {
    const now = new Date();
    const created = new Date(submittedAt);
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const filteredQueue = getFilteredQueue();

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">MD Review Queue</h2>
            <p className="text-sm text-gray-500">{queue.length} pending consultations</p>
          </div>
          {queue.length > 50 && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              {queue.length}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'urgent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Urgent
          </button>
          <button
            onClick={() => setFilter('high_consensus')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'high_consensus'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            High Consensus
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'new'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            New
          </button>
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {filteredQueue.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No pending consultations for review
          </div>
        ) : (
          filteredQueue.map((consultation, idx) => (
            <div key={`mdqueue-${idx}-${consultation.consultationId}`} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      Case #{consultation.caseId || consultation.consultationId.slice(0, 8)}
                    </span>
                    <span suppressHydrationWarning className="text-xs text-gray-500">{getTimeSinceCreated(consultation.submittedAt)}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {consultation.tier || 'complete'} → verified
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {consultation.userQuestion || 'No question available'}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>
                      {consultation.specialistCount || 0} specialists
                    </span>
                    <span>
                      {consultation.consensus ? `${Math.round(consultation.consensus * 100)}% consensus` : 'No consensus data'}
                    </span>
                    {consultation.userSatisfaction && (
                      <span>⭐ {consultation.userSatisfaction.toFixed(1)}/10</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Link
                  href={`/admin/md-review?consultationId=${consultation.consultationId}`}
                  className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Review
                </Link>
                <Link
                  href={`/track/${consultation.caseId || consultation.consultationId}`}
                  target="_blank"
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  View Full
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {queue.length > 10 && (
        <div className="px-6 py-3 bg-gray-50 border-t text-center">
          <Link
            href="/admin/md-review"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All {queue.length} Pending Reviews →
          </Link>
        </div>
      )}
    </div>
  );
}
