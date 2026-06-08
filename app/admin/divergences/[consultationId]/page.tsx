'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { DivergenceRecord } from '@/lib/types';
import { DivergenceCard } from '@/components/divergence/DivergenceCard';

export default function DivergenceDetailPage({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
  const { consultationId } = use(params);
  const [divergences, setDivergences] = useState<DivergenceRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/admin/divergences/${consultationId}`);
        if (res.ok) {
          const data = await res.json();
          setDivergences(data.divergences || []);
        } else {
          setDivergences([]);
        }
      } catch (error) {
        console.error('Failed to fetch divergence detail:', error);
        setDivergences([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [consultationId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-600 text-white p-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-sm transition-colors mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-1">Panel Deliberation</h1>
          <p className="text-sm opacity-90 font-mono break-all">{consultationId}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border p-6 animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : divergences && divergences.length > 0 ? (
          divergences.map((d, i) => (
            <DivergenceCard key={d.id ?? `${d.decisionPointId}-${i}`} record={d} />
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <p className="text-gray-500">No divergences recorded for this consultation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
