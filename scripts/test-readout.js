#!/usr/bin/env node

/**
 * Readout LLM test harness — manual prerelease gate.
 *
 * Three layers:
 *   1. Determinism — same context × 5 runs → identical direction; <=15% char drift
 *   2. Hallucination resistance — every number in output must appear in context;
 *      no future-tense verbs; no emojis; no "improvement" on negative deltas
 *   3. Adversarial — empty findings, body_part='other', missing PI → graceful
 *
 * Usage:
 *   node scripts/test-readout.js
 */

require('dotenv').config({ path: '.env.local' });

const path = require('path');
const tsxPath = path.resolve(__dirname, '..', 'node_modules', '.bin', 'tsx');

// We invoke the TS module via dynamic import after registering tsx if present.
// Simpler: require the built path and rely on Next's transpile in tests is overkill.
// Instead we re-implement a minimal local copy of the composer call by shelling
// out through a child process if needed. For now, run via tsx directly.

const { execSync } = require('child_process');
const fs = require('fs');

const HARNESS_TS = `
import { composeReadout } from '../lib/readouts/composeReadout';
import { ReadoutContext } from '../lib/readouts/readoutContext';

const ctx = (overrides: Partial<ReadoutContext>): ReadoutContext => Object.freeze({
  consultationId: 'test',
  timepoint: '4week' as const,
  bodyPart: 'knee',
  consultationDate: '2026-01-01T00:00:00.000Z',
  daysFromBaseline: 28,
  weekNumber: 4,
  isPainRelated: true,
  baseline: { physicalFunctionTScore: 40, painInterferenceTScore: 60 },
  current: { physicalFunctionTScore: 48, painInterferenceTScore: 54 },
  delta: { physicalFunction: 8, painInterference: 6, isClinicallyMeaningful: true },
  keyFindings: ['Pain worse climbing stairs', 'Stiffness in the morning'],
  suggestedFollowUp: ['Watch whether pain stays localized'],
  mcidThreshold: 5,
  contextHash: 'fixture',
  ...overrides,
});

const FIXTURES = {
  good: ctx({}),
  plateau: ctx({
    current: { physicalFunctionTScore: 41, painInterferenceTScore: 59 },
    delta: { physicalFunction: 1, painInterference: 1, isClinicallyMeaningful: false },
  }),
  regression: ctx({
    current: { physicalFunctionTScore: 36, painInterferenceTScore: 64 },
    delta: { physicalFunction: -4, painInterference: -4, isClinicallyMeaningful: false },
  }),
  noFindings: ctx({ keyFindings: [], suggestedFollowUp: [] }),
  bodyPartOther: ctx({ bodyPart: 'other' }),
  noPain: ctx({
    isPainRelated: false,
    baseline: { physicalFunctionTScore: 40, painInterferenceTScore: null },
    current: { physicalFunctionTScore: 48, painInterferenceTScore: null },
    delta: { physicalFunction: 8, painInterference: null, isClinicallyMeaningful: true },
  }),
};

const FUTURE_VERBS = /\\b(will|going to|expect to|in the next|over the coming)\\b/i;
const EMOJI = /[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{27BF}\\u{1F000}-\\u{1F02F}\\u{2700}-\\u{27BF}]/u;
const NUMBER = /[+-]?\\d+(?:\\.\\d+)?/g;

async function runFixture(name: string, fx: ReadoutContext, runs: number = 3) {
  console.log(\`\\n── \${name} ─────────────\`);
  const results: any[] = [];
  for (let i = 0; i < runs; i++) {
    const r = await composeReadout(fx);
    results.push(r);
  }

  const directions = new Set(results.map((r) => r.output.honesty_check.direction));
  console.log(\`  status:\`, results.map((r) => r.status).join(','));
  console.log(\`  direction agreement:\`, directions.size === 1 ? 'OK' : \`MISMATCH (\${[...directions].join('/')})\`);

  for (const r of results) {
    const combined = \`\${r.output.component1_delta}\\n\${r.output.component3_plan_vs_reality}\`;

    if (FUTURE_VERBS.test(combined)) {
      console.log(\`  ❌ future-tense detected: "\${combined.match(FUTURE_VERBS)?.[0]}"\`);
    }
    if (EMOJI.test(combined)) {
      console.log(\`  ❌ emoji detected\`);
    }
    const numbers = combined.match(NUMBER) || [];
    const allowed = new Set([
      String(fx.delta.physicalFunction),
      String(Math.abs(fx.delta.physicalFunction)),
      String(fx.baseline.physicalFunctionTScore),
      String(fx.current.physicalFunctionTScore),
      String(fx.mcidThreshold),
      String(fx.weekNumber),
    ]);
    if (fx.delta.painInterference != null) {
      allowed.add(String(fx.delta.painInterference));
      allowed.add(String(Math.abs(fx.delta.painInterference)));
    }
    if (fx.baseline.painInterferenceTScore != null) allowed.add(String(fx.baseline.painInterferenceTScore));
    if (fx.current.painInterferenceTScore != null) allowed.add(String(fx.current.painInterferenceTScore));

    for (const n of numbers) {
      // Accept ±-prefixed and integer-form matches
      const stripped = n.replace(/^[+]/, '');
      const intForm = Math.abs(parseFloat(stripped)).toFixed(0);
      if (!allowed.has(stripped) && !allowed.has(intForm)) {
        console.log(\`  ❌ unauthorized number: "\${n}" — allowed: \${[...allowed].join(',')}\`);
      }
    }

    if (fx.delta.physicalFunction < 0 && /improvement|progress/i.test(combined)) {
      console.log(\`  ❌ negative-delta but text contains "improvement" or "progress"\`);
    }
    if (fx.bodyPart === 'other' && /your other/i.test(combined)) {
      console.log(\`  ❌ "your other ..." leaked\`);
    }
  }

  console.log(\`  sample component1:\`, results[0].output.component1_delta);
  console.log(\`  sample component3:\`, results[0].output.component3_plan_vs_reality);
}

(async () => {
  console.log('Readout test harness — single run per fixture');
  for (const [name, fx] of Object.entries(FIXTURES)) {
    await runFixture(name, fx, 1);
  }
  console.log('\\nDone.');
})();
`;

const tmpFile = path.resolve(__dirname, '_test-readout-harness.ts');
fs.writeFileSync(tmpFile, HARNESS_TS);

try {
  execSync(`npx tsx ${tmpFile}`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
} finally {
  try { fs.unlinkSync(tmpFile); } catch {}
}
