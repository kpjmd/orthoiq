'use client';

import Link from 'next/link';
import { DivergenceRecord } from '@/lib/types';

// Compact feed-row for the admin "Recent divergences" list. Links to the
// per-consult detail route. Persisted = visually prominent / rare-feeling.

function timeAgo(date?: Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function DivergenceFeedCard({ record }: { record: DivergenceRecord }) {
  const { persisted } = record;
  return (
    <Link
      href={`/admin/divergences/${record.consultationId}`}
      className={`block rounded-lg border p-4 transition-colors hover:shadow-sm ${
        persisted
          ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{record.decisionQuestion}</p>
        {persisted ? (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
            ⚖️ Equipoise held
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
            Converged
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span>{record.changedCount} revised</span>
        <span>·</span>
        <span>{timeAgo(record.createdAt)}</span>
        <span className="truncate font-mono text-gray-400">{record.consultationId}</span>
      </div>
    </Link>
  );
}
