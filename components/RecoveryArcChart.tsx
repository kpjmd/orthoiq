'use client';

import { motion } from 'framer-motion';
import { PROMISTimepoint } from '@/lib/promisTypes';

interface PromisResponseRow {
  timepoint: PROMISTimepoint | 'baseline';
  physical_function_t_score: number;
  pain_interference_t_score: number | null;
}

interface RecoveryArcChartProps {
  responses: PromisResponseRow[];
  targetTimepoint: PROMISTimepoint | null;
  showMcidReference?: boolean;
  isPainRelated?: boolean;
}

const TIMEPOINTS: Array<{ key: PROMISTimepoint | 'baseline'; label: string; x: number }> = [
  { key: 'baseline', label: 'Baseline', x: 0 },
  { key: '2week', label: 'Wk 2', x: 1 },
  { key: '4week', label: 'Wk 4', x: 2 },
  { key: '8week', label: 'Wk 8', x: 3 },
];

const MCID = 5;
const VIEW_W = 480;
const VIEW_H = 200;
const PAD_X = 36;
const PAD_Y = 28;
const Y_RANGE = 20; // ±20 T-score points

function yToPx(deltaPoints: number): number {
  const innerH = VIEW_H - 2 * PAD_Y;
  const t = (Y_RANGE - deltaPoints) / (2 * Y_RANGE);
  return PAD_Y + t * innerH;
}

function xToPx(xIdx: number): number {
  const innerW = VIEW_W - 2 * PAD_X;
  return PAD_X + (xIdx / 3) * innerW;
}

export default function RecoveryArcChart({
  responses,
  targetTimepoint,
  showMcidReference = true,
  isPainRelated = true,
}: RecoveryArcChartProps) {
  const baseline = responses.find((r) => r.timepoint === 'baseline');

  // Compute deltas (positive = improvement) per timepoint
  type Point = { xIdx: number; pf: number | null; pi: number | null; isTarget: boolean; key: string };
  const points: Point[] = TIMEPOINTS.map((tp, idx) => {
    const row = responses.find((r) => r.timepoint === tp.key);
    if (!row || !baseline) {
      return { xIdx: idx, pf: null, pi: null, isTarget: tp.key === targetTimepoint, key: tp.key };
    }
    if (tp.key === 'baseline') {
      // Baseline is the reference: by definition delta = 0
      return { xIdx: idx, pf: 0, pi: baseline.pain_interference_t_score != null ? 0 : null, isTarget: false, key: tp.key };
    }
    const pfDelta = row.physical_function_t_score - baseline.physical_function_t_score;
    const piDelta =
      row.pain_interference_t_score != null && baseline.pain_interference_t_score != null
        ? baseline.pain_interference_t_score - row.pain_interference_t_score // reversed: lower = better
        : null;
    return { xIdx: idx, pf: pfDelta, pi: piDelta, isTarget: false, key: tp.key };
  });

  const pfPolyline = points
    .filter((p) => p.pf !== null)
    .map((p) => `${xToPx(p.xIdx)},${yToPx(p.pf as number)}`)
    .join(' ');
  const piPolyline = points
    .filter((p) => p.pi !== null)
    .map((p) => `${xToPx(p.xIdx)},${yToPx(p.pi as number)}`)
    .join(' ');

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        role="img"
        aria-label="Recovery arc chart"
      >
        {/* Zero line (baseline reference) */}
        <line
          x1={PAD_X}
          x2={VIEW_W - PAD_X}
          y1={yToPx(0)}
          y2={yToPx(0)}
          stroke="#475569"
          strokeWidth={1}
        />
        <text x={PAD_X - 6} y={yToPx(0) + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
          baseline
        </text>

        {/* MCID reference (±5) */}
        {showMcidReference && (
          <>
            <line
              x1={PAD_X}
              x2={VIEW_W - PAD_X}
              y1={yToPx(MCID)}
              y2={yToPx(MCID)}
              stroke="#334155"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <line
              x1={PAD_X}
              x2={VIEW_W - PAD_X}
              y1={yToPx(-MCID)}
              y2={yToPx(-MCID)}
              stroke="#334155"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <text x={VIEW_W - PAD_X + 4} y={yToPx(MCID) + 4} fontSize="9" fill="#64748b">
              +5
            </text>
            <text x={VIEW_W - PAD_X + 4} y={yToPx(-MCID) + 4} fontSize="9" fill="#64748b">
              −5
            </text>
          </>
        )}

        {/* X-axis labels */}
        {TIMEPOINTS.map((tp, idx) => (
          <text
            key={tp.key}
            x={xToPx(idx)}
            y={VIEW_H - 8}
            fontSize="11"
            fill="#94a3b8"
            textAnchor="middle"
          >
            {tp.label}
          </text>
        ))}

        {/* PF line */}
        {pfPolyline && (
          <motion.polyline
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pfPolyline}
          />
        )}

        {/* PI line */}
        {isPainRelated && piPolyline && (
          <motion.polyline
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            fill="none"
            stroke="#a855f7"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={piPolyline}
          />
        )}

        {/* PF circles */}
        {points
          .filter((p) => p.pf !== null)
          .map((p) => (
            <motion.circle
              key={`pf-${p.key}`}
              cx={xToPx(p.xIdx)}
              cy={yToPx(p.pf as number)}
              r={4}
              fill="#3b82f6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, delay: p.xIdx * 0.05 }}
            />
          ))}

        {/* PI circles */}
        {isPainRelated &&
          points
            .filter((p) => p.pi !== null)
            .map((p) => (
              <motion.circle
                key={`pi-${p.key}`}
                cx={xToPx(p.xIdx)}
                cy={yToPx(p.pi as number)}
                r={4}
                fill="#a855f7"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25, delay: p.xIdx * 0.05 + 0.05 }}
              />
            ))}

        {/* Ghost target circle */}
        {points
          .filter((p) => p.isTarget)
          .map((p) => (
            <circle
              key={`target-${p.key}`}
              cx={xToPx(p.xIdx)}
              cy={yToPx(0)}
              r={6}
              fill="none"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          ))}
      </svg>

      <div className="flex items-center justify-center gap-5 text-xs text-gray-400 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6]" />
          Physical function
        </span>
        {isPainRelated && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[#a855f7]" />
            Pain interference
          </span>
        )}
      </div>
    </div>
  );
}
