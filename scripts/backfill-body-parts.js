#!/usr/bin/env node

/**
 * Backfill body_part on consultations.consultations rows where body_part IS NULL.
 *
 * Safety gates:
 *   - env BACKFILL_BODY_PARTS_ENABLED must be 'true'
 *   - --confirm flag required for actual writes
 *   - --dry-run writes a CSV of inferred values without touching the DB
 *
 * Usage:
 *   BACKFILL_BODY_PARTS_ENABLED=true node scripts/backfill-body-parts.js --dry-run
 *   BACKFILL_BODY_PARTS_ENABLED=true node scripts/backfill-body-parts.js --confirm
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');

const BODY_PART_ENUM = [
  'knee', 'shoulder', 'hip', 'ankle', 'back', 'neck',
  'wrist', 'elbow', 'foot', 'hand', 'other',
];

const SYSTEM_PROMPT = `You categorize orthopedic consultations by anatomical region.

Output exactly one JSON object: {"body_part": "<value>"} where <value> is one of:
  knee, shoulder, hip, ankle, back, neck, wrist, elbow, foot, hand, other

Rules:
- "back" includes lumbar, thoracic, spine, lower back, upper back
- "other" if multiple regions are equally primary, or no clear region
- "other" if the consultation is general (sleep, mental health, nutrition)
- Pick the PRIMARY region — the one the patient is most concerned about
- Output JSON only. No markdown, no explanation.`;

const BATCH_SIZE = 50;
const SLEEP_MS = 200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function classifyBodyPart(anthropic, questionText) {
  const userPrompt = `User question:\n${questionText}\n\nOutput JSON only.`;
  try {
    const result = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const content = result.content[0];
    if (content.type !== 'text') return 'other';
    let cleaned = content.text.trim();
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    }
    const parsed = JSON.parse(cleaned);
    const value = String(parsed.body_part || '').toLowerCase();
    return BODY_PART_ENUM.includes(value) ? value : 'other';
  } catch (e) {
    console.warn('  classification failed:', e.message);
    return null;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isDryRun = args.has('--dry-run');
  const isConfirmed = args.has('--confirm');

  if (process.env.BACKFILL_BODY_PARTS_ENABLED !== 'true') {
    console.error('Refusing to run: set BACKFILL_BODY_PARTS_ENABLED=true to enable.');
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
    ? fs.createWriteStream(path.join(process.cwd(), `body-part-backfill-${Date.now()}.csv`))
    : null;
  if (dryRunCsv) dryRunCsv.write('consultation_id,question_id,body_part,question_excerpt\n');

  let totalUpdated = 0;
  let totalProcessed = 0;
  let batchNum = 0;

  while (true) {
    batchNum++;
    const rows = await sql`
      SELECT c.id, c.consultation_id, c.question_id, q.question AS question_text
      FROM consultations c
      LEFT JOIN questions q ON q.id = c.question_id
      WHERE c.body_part IS NULL
      ORDER BY c.id ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (rows.length === 0) break;

    console.log(`\nBatch ${batchNum}: ${rows.length} rows`);

    for (const row of rows) {
      totalProcessed++;
      if (!row.question_text) {
        console.log(`  [${row.consultation_id}] no question text — assigning 'other'`);
        if (!isDryRun) {
          await sql`UPDATE consultations SET body_part = 'other' WHERE id = ${row.id}`;
          totalUpdated++;
        } else {
          dryRunCsv.write(`${row.consultation_id},${row.question_id},other,\n`);
        }
        continue;
      }

      const bp = await classifyBodyPart(anthropic, row.question_text);
      if (!bp) {
        console.log(`  [${row.consultation_id}] classification skipped (error)`);
        continue;
      }

      const excerpt = row.question_text.slice(0, 80).replace(/"/g, "'").replace(/[\r\n]+/g, ' ');
      console.log(`  [${row.consultation_id}] → ${bp}`);

      if (isDryRun) {
        dryRunCsv.write(`${row.consultation_id},${row.question_id},${bp},"${excerpt}"\n`);
      } else {
        await sql`UPDATE consultations SET body_part = ${bp} WHERE id = ${row.id}`;
        totalUpdated++;
      }

      await sleep(SLEEP_MS);
    }
  }

  if (dryRunCsv) dryRunCsv.end();

  console.log(`\nDone. Processed: ${totalProcessed}, ${isDryRun ? 'Dry-run rows written' : 'Updated'}: ${totalUpdated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
