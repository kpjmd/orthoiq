'use client';

import { useEffect, useState } from 'react';
import type { InstrumentViewResult } from '@/lib/database';

interface InstrumentResponse {
  benchmarkAccuracy: InstrumentViewResult;
  convergenceByModel: InstrumentViewResult;
  evidenceCoverage: InstrumentViewResult;
  detectorMdAgreement: InstrumentViewResult;
}

const EMPTY: InstrumentViewResult = { available: false, rows: [] };

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    // Ratios in [0,1] read best at 3 decimals; counts/ints stay as-is.
    return Number.isInteger(v) ? String(v) : v.toFixed(3);
  }
  return String(v);
}

function prettyKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Pull a value whose column name loosely matches any of the given fragments.
function pick(row: Record<string, unknown> | undefined, ...fragments: string[]): unknown {
  if (!row) return undefined;
  const key = Object.keys(row).find(k => fragments.some(f => k.toLowerCase().includes(f)));
  return key ? row[key] : undefined;
}

function GenericTable({ view }: { view: InstrumentViewResult }) {
  if (!view.available) {
    return <p className="text-sm text-gray-400 italic">View not available in this environment.</p>;
  }
  if (view.rows.length === 0) {
    return <p className="text-sm text-gray-400 italic">No rows yet.</p>;
  }
  const columns = Object.keys(view.rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
            {columns.map(c => (
              <th key={c} className="px-3 py-2 font-medium">{prettyKey(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {columns.map(c => (
                <td key={c} className="px-3 py-2 text-gray-700">{fmt(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BenchmarkHeadline({ view }: { view: InstrumentViewResult }) {
  if (!view.available) {
    return <p className="text-sm text-gray-400 italic">v_benchmark_accuracy not available in this environment.</p>;
  }
  const row = view.rows[0];
  const sensitivity = pick(row, 'sensitivit');
  const specificity = pick(row, 'specificit');
  const absolute = pick(row, 'absolute', 'indication');
  const haveHeadline = sensitivity !== undefined || specificity !== undefined || absolute !== undefined;

  if (!haveHeadline) {
    // Unknown shape — fall back to the raw row(s).
    return <GenericTable view={view} />;
  }

  const cells = [
    { label: 'Sensitivity', value: sensitivity, hint: 'detects genuine equipoise' },
    { label: 'Specificity', value: specificity, hint: 'trustworthy negatives' },
    { label: 'Absolute indication', value: absolute, hint: 'settled-operative recall' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cells.map(c => (
        <div key={c.label} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
          <div className="text-3xl font-bold text-emerald-700">{fmt(c.value)}</div>
          <div className="mt-1 text-sm font-medium text-gray-700">{c.label}</div>
          <div className="text-xs text-gray-500">{c.hint}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, badge, blurb, children }: { title: string; badge?: string; blurb?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {badge}
            </span>
          )}
        </div>
        {blurb && <p className="text-sm text-gray-500">{blurb}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function InstrumentMetrics() {
  const [data, setData] = useState<InstrumentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/instrument');
        if (res.ok && !cancelled) setData(await res.json());
      } catch (error) {
        console.error('Failed to fetch instrument views:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const d = data || {
    benchmarkAccuracy: EMPTY,
    convergenceByModel: EMPTY,
    evidenceCoverage: EMPTY,
    detectorMdAgreement: EMPTY,
  };

  return (
    <div className="space-y-6">
      <Section
        title="Instrument accuracy"
        badge="⚖️ The moat"
        blurb="Validated calibration of the equipoise detector on the 122-case benchmark."
      >
        <BenchmarkHeadline view={d.benchmarkAccuracy} />
      </Section>

      <Section title="Convergence over time" blurb="Convergence vs. equipoise broken out by model.">
        <GenericTable view={d.convergenceByModel} />
      </Section>

      <Section title="Evidence coverage / gaps" blurb="Per-decision evidence and population coverage, including panels with no accepted evidence.">
        <GenericTable view={d.evidenceCoverage} />
      </Section>

      <Section title="MD agreement" blurb="Detector verdicts vs. MD adjudication.">
        <GenericTable view={d.detectorMdAgreement} />
      </Section>
    </div>
  );
}
