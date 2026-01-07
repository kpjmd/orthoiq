'use client';

import { useEffect, useState } from 'react';

export function QueueAlert() {
  const [queueCount, setQueueCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQueueCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchQueueCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueueCount = async () => {
    try {
      const res = await fetch('/api/admin/md-review/queue');
      if (res.ok) {
        const data = await res.json();
        setQueueCount(data.pending?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch queue count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || queueCount <= 50) {
    return null;
  }

  return (
    <div className="mt-4 bg-red-500 text-white px-4 py-3 rounded-lg flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <div className="font-bold">MD Review Queue Alert</div>
          <div className="text-sm opacity-90">
            {queueCount} pending consultations need review
          </div>
        </div>
      </div>
      <span className="bg-white text-red-600 px-3 py-1 rounded-full font-bold text-lg">
        {queueCount}
      </span>
    </div>
  );
}
