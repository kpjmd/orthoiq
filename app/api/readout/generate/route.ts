import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/database';
import { buildReadoutContext } from '@/lib/readouts/readoutContext';
import { composeReadout, READOUT_PROMPT_VERSION } from '@/lib/readouts/composeReadout';
import { PROMISTimepoint } from '@/lib/promisTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TIMEPOINTS: PROMISTimepoint[] = ['2week', '4week', '8week'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const consultationId = body?.consultationId;
    const timepoint = body?.timepoint as PROMISTimepoint;

    if (!consultationId || !VALID_TIMEPOINTS.includes(timepoint)) {
      return NextResponse.json(
        { error: 'consultationId and timepoint (2week|4week|8week) required' },
        { status: 400 },
      );
    }

    const sql = getSql();

    // Idempotency: if a stored readout already exists for this (consultation, timepoint), return it.
    const existing = await sql`
      SELECT consultation_id, timepoint, component1_text, component3_text,
             generation_status, created_at AS generated_at
      FROM milestone_readouts
      WHERE consultation_id = ${consultationId} AND timepoint = ${timepoint}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json({ readout: existing[0], cached: true });
    }

    // Build deterministic context from DB + arithmetic.
    const ctxResult = await buildReadoutContext(consultationId, timepoint);
    if ('error' in ctxResult) {
      return NextResponse.json({ error: ctxResult.error }, { status: 422 });
    }
    const ctx = ctxResult;

    // Compose via LLM (with deterministic fallback baked in)
    const composed = await composeReadout(ctx);

    // Persist. Use ON CONFLICT DO NOTHING to handle simultaneous-request race
    // safely; if another request beat us, re-read and return that row.
    await sql`
      INSERT INTO milestone_readouts (
        consultation_id, timepoint, context_hash, prompt_version,
        generation_status, component1_text, component3_text,
        honesty_check, raw_response
      ) VALUES (
        ${consultationId},
        ${timepoint},
        ${ctx.contextHash},
        ${READOUT_PROMPT_VERSION},
        ${composed.status},
        ${composed.output.component1_delta},
        ${composed.output.component3_plan_vs_reality},
        ${JSON.stringify(composed.output.honesty_check)},
        ${composed.rawResponse}
      )
      ON CONFLICT (consultation_id, timepoint) DO NOTHING
    `;

    const stored = await sql`
      SELECT consultation_id, timepoint, component1_text, component3_text,
             generation_status, created_at AS generated_at
      FROM milestone_readouts
      WHERE consultation_id = ${consultationId} AND timepoint = ${timepoint}
      LIMIT 1
    `;

    return NextResponse.json({
      readout: stored[0] || {
        consultation_id: consultationId,
        timepoint,
        component1_text: composed.output.component1_delta,
        component3_text: composed.output.component3_plan_vs_reality,
        generation_status: composed.status,
        generated_at: new Date().toISOString(),
      },
      cached: false,
    });
  } catch (error) {
    console.error('Readout generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate readout' },
      { status: 500 },
    );
  }
}
