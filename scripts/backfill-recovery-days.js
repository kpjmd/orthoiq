#!/usr/bin/env node

/**
 * Backfill predicted_recovery_days on consultations rows where the value IS NULL.
 *
 * Safety gates:
 *   - env BACKFILL_RECOVERY_DAYS_ENABLED must be 'true'
 *   - --confirm flag required for actual writes
 *   - --dry-run writes a CSV of inferred values without touching the DB
 *
 * Usage:
 *   BACKFILL_RECOVERY_DAYS_ENABLED=true node scripts/backfill-recovery-days.js --dry-run
 *   BACKFILL_RECOVERY_DAYS_ENABLED=true node scripts/backfill-recovery-days.js --confirm
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');

const MIN_DAYS = 1;
const MAX_DAYS = 730;

const SYSTEM_PROMPT = `You estimate a typical recovery window (in days) for an orthopedic concern.

Output exactly one JSON object: {"recovery_days": <integer or null>}

Rules:
- Estimate the typical window from the date of the consultation to a reasonable expectation of functional recovery for the described concern.
- Anchor on the body_part hint when provided and the nature of the concern (sprain, strain, post-surgical, chronic, overuse, etc.).
- Use null when:
  - The question is non-clinical (sleep, mental health, nutrition, general fitness).
  - The question is general/educational and not tied to a specific recovery scenario.
  - No reasonable estimate can be made from the information given.
- Integer only. No decimals. No ranges. Pick a single median-case integer.
- Valid range: ${MIN_DAYS}-${MAX_DAYS} days. Use null for anything outside.
- Output JSON only. No markdown, no explanation, no rationale.`;

const BATCH_SIZE = 50;
const SLEEP_MS = 200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function classifyRecoveryDays(anthropic, questionText, bodyPart) {
  const bodyPartLine = bodyPart && bodyPart !== 'other' ? `\nBody part: ${bodyPart}` : '';
  const userPrompt = `User question:\n${questionText}${bodyPartLine}\n\nOutput JSON only.`;
  try {
    const result = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const content = result.content[0];
    if (content.type !== 'text') return { ok: false };
    let cleaned = content.text.trim();
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    }
    const parsed = JSON.parse(cleaned);
    const raw = parsed.recovery_days;
    if (raw === null || raw === undefined) return { ok: true, days: null };
    const n = Number(raw);
    if (!Number.isFinite(n)) return { ok: true, days: null };
    const days = Math.round(n);
    if (days < MIN_DAYS || days > MAX_DAYS) return { ok: true, days: null };
    return { ok: true, days };
  } catch (e) {
    console.warn('  classification failed:', e.message);
    return { ok: false };
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isDryRun = args.has('--dry-run');
  const isConfirmed = args.has('--confirm');

  if (process.env.BACKFILL_RECOVERY_DAYS_ENABLED !== 'true') {
    console.error('Refusing to run: set BACKFILL_RECOVERY_DAYS_ENABLED=true to enable.');
    process.exit(1);
  }
  if (!isDryRun && !isConfirmed) {
    console.error('Refusing to write: pass --dry-run (preview to CSV) or --confirm (actual writes).');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const dryRunCsv = isDryRun
    ? fs.createWriteStream(path.join(process.cwd(), `recovery-days-backfill-${Date.now()}.csv`))
    : null;
  if (dryRunCsv) dryRunCsv.write('consultation_id,question_id,body_part,predicted_recovery_days,question_excerpt\n');

  // Cursor-based pagination on id. Necessary because in dry-run we don't UPDATE,
  // and "WHERE predicted_recovery_days IS NULL" would re-select the same rows forever.
  // In --confirm mode, the cursor still works (writes shrink the set monotonically).
  let cursorId = 0;
  let totalUpdated = 0;
  let totalProcessed = 0;
  let totalNull = 0;
  let batchNum = 0;

  while (true) {
    batchNum++;
    const rows = await sql`
      SELECT c.id, c.consultation_id, c.question_id, c.body_part, q.question AS question_text
      FROM consultations c
      LEFT JOIN questions q ON q.id = c.question_id
      WHERE c.predicted_recovery_days IS NULL AND c.id > ${cursorId}
      ORDER BY c.id ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (rows.length === 0) break;

    console.log(`\nBatch ${batchNum}: ${rows.length} rows (cursor > ${cursorId})`);

    for (const row of rows) {
      totalProcessed++;
      cursorId = Number(row.id);

      if (!row.question_text) {
        console.log(`  [${row.consultation_id}] no question text — leaving NULL`);
        if (isDryRun) dryRunCsv.write(`${row.consultation_id},${row.question_id},${row.body_part || ''},,\n`);
        totalNull++;
        continue;
      }

      const out = await classifyRecoveryDays(anthropic, row.question_text, row.body_part);
      if (!out.ok) {
        console.log(`  [${row.consultation_id}] classification skipped (error)`);
        continue;
      }

      const excerpt = row.question_text.slice(0, 80).replace(/"/g, "'").replace(/[\r\n]+/g, ' ');
      console.log(`  [${row.consultation_id}] → ${out.days === null ? 'NULL' : out.days}`);

      if (isDryRun) {
        dryRunCsv.write(`${row.consultation_id},${row.question_id},${row.body_part || ''},${out.days === null ? '' : out.days},"${excerpt}"\n`);
      } else if (out.days !== null) {
        await sql`UPDATE consultations SET predicted_recovery_days = ${out.days} WHERE id = ${row.id}`;
        totalUpdated++;
      } else {
        totalNull++;
      }

      await sleep(SLEEP_MS);
    }
  }

  if (dryRunCsv) dryRunCsv.end();

  console.log(`\nDone. Processed: ${totalProcessed}, ${isDryRun ? 'Dry-run rows written' : 'Updated'}: ${totalUpdated}, NULL (no estimate): ${totalNull}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
