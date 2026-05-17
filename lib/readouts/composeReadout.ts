import Anthropic from '@anthropic-ai/sdk';
import { ReadoutContext } from './readoutContext';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export const READOUT_PROMPT_VERSION = 1;
const MODEL = 'claude-haiku-4-5-20251001';

export interface ReadoutOutput {
  component1_delta: string;
  component3_plan_vs_reality: string;
  honesty_check: {
    direction: 'improvement' | 'decline' | 'stable';
    clinically_meaningful: boolean;
    cited_values: string[];
  };
}

export interface ComposeReadoutResult {
  status: 'success' | 'fallback';
  output: ReadoutOutput;
  rawResponse: string | null;
}

const SYSTEM_PROMPT = `You are an orthopedic recovery interpreter. You write 2 short, factual paragraphs for a patient who just submitted a PROMIS questionnaire.

Component 1 (Delta): Describe what changed between baseline and this follow-up, grounded ONLY in PROMIS T-scores supplied in the input. State magnitude and direction honestly. If decline, say so plainly — do not soften with "but" clauses.

Component 3 (Plan vs Reality): Compare the original specialist key findings and suggested follow-up against the patient's reported state. Was the trajectory consistent with what specialists flagged? Name specific findings/follow-ups that the data supports OR contradicts. If no findings exist, state that the original assessment did not include specific predictions for this timepoint.

HARD RULES:
- You may cite ONLY values present in the input JSON, echoed verbatim in the user message. Do not invent numbers, timeframes, body parts, diagnoses, or specialist names.
- You may NOT predict the future. No "you'll likely...", no "in the next few weeks..." — past tense and present tense only.
- The MCID (minimum clinically important difference) is 5 points. Use exactly this language: "clinically meaningful" or "below the threshold of clinical change". Do not invent thresholds.
- If body_part is "other" or null, say "your recovery" — never "your [other] recovery".
- No emojis. No exclamation marks. No motivational filler.
- If pf_delta is negative, do not use the words "improvement" or "progress" anywhere in your output — not even in phrases like "lack of improvement". Use "recovery has not moved in a positive direction" or similar phrasing instead.
- Output JSON only, matching the schema. No markdown, no code fences.

JSON schema:
{
  "component1_delta": "<2-3 sentences>",
  "component3_plan_vs_reality": "<2-3 sentences>",
  "honesty_check": {
    "direction": "improvement" | "decline" | "stable",
    "clinically_meaningful": true | false,
    "cited_values": ["<field name 1>", "<field name 2>"]
  }
}

Example output for a good recovery (pf_delta: +8.0, pi_delta: +6.0):
{"component1_delta":"Your physical function score has moved up 8 points from baseline, and pain interference has dropped 6 points — both clinically meaningful changes.","component3_plan_vs_reality":"At your consultation, the agents flagged that gradual improvement in everyday activity was expected. Your current scores are consistent with that trajectory.","honesty_check":{"direction":"improvement","clinically_meaningful":true,"cited_values":["pf_delta","pi_delta","key_findings[0]"]}}

Example output for a plateau (pf_delta: +1.2, pi_delta: +0.8):
{"component1_delta":"Your physical function score is up 1 point from baseline, and pain interference is essentially unchanged. Both are below the threshold of clinical change.","component3_plan_vs_reality":"The original assessment anticipated faster improvement by this timepoint. The lack of movement may be worth raising with a clinician.","honesty_check":{"direction":"stable","clinically_meaningful":false,"cited_values":["pf_delta","pi_delta"]}}

Example output for a regression (pf_delta: -4.0, pi_delta: -3.5):
{"component1_delta":"Your physical function has declined 4 points from baseline, and pain interference has increased 4 points. The change in physical function is at the edge of clinical meaning; the increase in pain interference is below the threshold of clinical change.","component3_plan_vs_reality":"The original key findings did not anticipate this direction. This may be worth discussing with a clinician.","honesty_check":{"direction":"decline","clinically_meaningful":false,"cited_values":["pf_delta","pi_delta"]}}`;

function buildUserPrompt(ctx: ReadoutContext): string {
  const allowed: Record<string, unknown> = {
    baseline_pf_t: ctx.baseline.physicalFunctionTScore,
    followup_pf_t: ctx.current.physicalFunctionTScore,
    pf_delta: ctx.delta.physicalFunction,
    weeks_since_consult: ctx.weekNumber,
    body_part: ctx.bodyPart || 'other',
    key_findings: ctx.keyFindings,
    suggested_follow_up: ctx.suggestedFollowUp,
    mcid_pf: ctx.mcidThreshold,
  };
  if (ctx.isPainRelated && ctx.baseline.painInterferenceTScore != null && ctx.current.painInterferenceTScore != null && ctx.delta.painInterference != null) {
    allowed.baseline_pi_t = ctx.baseline.painInterferenceTScore;
    allowed.followup_pi_t = ctx.current.painInterferenceTScore;
    allowed.pi_delta = ctx.delta.painInterference;
    allowed.mcid_pi = ctx.mcidThreshold;
  }

  const cited = Object.entries(allowed)
    .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
    .join('\n');

  return `Input:\n${JSON.stringify(allowed, null, 2)}\n\nYou may cite ONLY these values:\n${cited}\n\nOutput JSON only.`;
}

function deterministicFallback(ctx: ReadoutContext): ReadoutOutput {
  const pf = ctx.delta.physicalFunction;
  const pi = ctx.delta.painInterference;
  const mcid = ctx.mcidThreshold;

  const direction: 'improvement' | 'decline' | 'stable' =
    pf >= 1 || (pi != null && pi >= 1)
      ? 'improvement'
      : pf <= -1 || (pi != null && pi <= -1)
        ? 'decline'
        : 'stable';

  const pfPhrase = `Your physical function score changed by ${pf >= 0 ? '+' : ''}${pf.toFixed(0)} points from baseline.`;
  const piPhrase =
    pi != null
      ? ` Pain interference changed by ${pi >= 0 ? '+' : '-'}${Math.abs(pi).toFixed(0)} points ${pi >= 0 ? '(improvement)' : '(worsening)'}.`
      : '';
  const mcidPhrase =
    Math.abs(pf) >= mcid || (pi != null && Math.abs(pi) >= mcid)
      ? ' Some changes meet the threshold of clinical meaning.'
      : ' Changes remain below the threshold of clinical change.';

  return {
    component1_delta: `${pfPhrase}${piPhrase}${mcidPhrase}`,
    component3_plan_vs_reality:
      ctx.keyFindings.length > 0
        ? `Original key findings: ${ctx.keyFindings.slice(0, 2).join('; ')}. Compare these against how you feel today.`
        : 'No specific predictions were recorded at consultation time for this timepoint.',
    honesty_check: {
      direction,
      clinically_meaningful: Math.abs(pf) >= mcid || (pi != null && Math.abs(pi) >= mcid),
      cited_values: ['pf_delta', ...(pi != null ? ['pi_delta'] : [])],
    },
  };
}

function validateOutput(parsed: any): parsed is ReadoutOutput {
  if (!parsed || typeof parsed !== 'object') return false;
  if (typeof parsed.component1_delta !== 'string' || parsed.component1_delta.length === 0) return false;
  if (typeof parsed.component3_plan_vs_reality !== 'string' || parsed.component3_plan_vs_reality.length === 0) return false;
  const hc = parsed.honesty_check;
  if (!hc || typeof hc !== 'object') return false;
  if (!['improvement', 'decline', 'stable'].includes(hc.direction)) return false;
  if (typeof hc.clinically_meaningful !== 'boolean') return false;
  if (!Array.isArray(hc.cited_values)) return false;
  return true;
}

export async function composeReadout(ctx: ReadoutContext): Promise<ComposeReadoutResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { status: 'fallback', output: deterministicFallback(ctx), rawResponse: null };
  }

  try {
    const result = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
    });

    const content = result.content[0];
    if (content.type !== 'text') {
      return { status: 'fallback', output: deterministicFallback(ctx), rawResponse: null };
    }

    let cleaned = content.text.trim();
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    }

    const parsed = JSON.parse(cleaned);
    if (!validateOutput(parsed)) {
      return { status: 'fallback', output: deterministicFallback(ctx), rawResponse: cleaned };
    }
    return { status: 'success', output: parsed, rawResponse: cleaned };
  } catch (e) {
    console.warn('composeReadout LLM call failed, falling back:', e);
    return { status: 'fallback', output: deterministicFallback(ctx), rawResponse: null };
  }
}
