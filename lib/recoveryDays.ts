import Anthropic from '@anthropic-ai/sdk';

const EXTRACTION_TIMEOUT_MS = 1500;
const MIN_DAYS = 1;
const MAX_DAYS = 730;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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

export async function extractRecoveryDays(input: {
  question: string;
  bodyPart?: string | null;
}): Promise<number | null> {
  const bodyPartLine =
    input.bodyPart && input.bodyPart !== 'other'
      ? `\nBody part: ${input.bodyPart}`
      : '';

  const userPrompt = [
    `User question:`,
    input.question.trim(),
    bodyPartLine,
    `\nOutput JSON only.`,
  ]
    .filter(Boolean)
    .join('\n');

  const apiCall = anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 50,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), EXTRACTION_TIMEOUT_MS),
  );

  try {
    const result = await Promise.race([apiCall, timeout]);
    if (!result) return null;

    const content = result.content[0];
    if (content.type !== 'text') return null;

    let cleaned = content.text.trim();
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    }

    const parsed = JSON.parse(cleaned);
    const raw = parsed.recovery_days;
    if (raw === null || raw === undefined) return null;

    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const days = Math.round(n);
    if (days < MIN_DAYS || days > MAX_DAYS) return null;
    return days;
  } catch {
    return null;
  }
}
