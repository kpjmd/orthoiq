import Anthropic from '@anthropic-ai/sdk';

export const BODY_PART_ENUM = [
  'knee',
  'shoulder',
  'hip',
  'ankle',
  'back',
  'neck',
  'wrist',
  'elbow',
  'foot',
  'hand',
  'other',
] as const;

export type BodyPart = typeof BODY_PART_ENUM[number];

const EXTRACTION_TIMEOUT_MS = 1500;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `You categorize orthopedic consultations by anatomical region.

Output exactly one JSON object: {"body_part": "<value>"} where <value> is one of:
  knee, shoulder, hip, ankle, back, neck, wrist, elbow, foot, hand, other

Rules:
- "back" includes lumbar, thoracic, spine, lower back, upper back
- "other" if multiple regions are equally primary, or no clear region
- "other" if the consultation is general (sleep, mental health, nutrition)
- Pick the PRIMARY region — the one the patient is most concerned about
- Output JSON only. No markdown, no explanation.`;

export async function extractBodyPart(input: {
  question: string;
  keyFindings?: string[];
}): Promise<BodyPart> {
  const userPrompt = [
    `User question:`,
    input.question.trim(),
    input.keyFindings && input.keyFindings.length > 0
      ? `\nKey findings:\n${input.keyFindings.join('\n')}`
      : '',
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
    if (!result) return 'other';

    const content = result.content[0];
    if (content.type !== 'text') return 'other';

    let cleaned = content.text.trim();
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    }

    const parsed = JSON.parse(cleaned);
    const value = String(parsed.body_part || '').toLowerCase();

    if ((BODY_PART_ENUM as readonly string[]).includes(value)) {
      return value as BodyPart;
    }
    return 'other';
  } catch {
    return 'other';
  }
}

export function bodyPartPhrase(bp: string | null | undefined): string {
  return bp && bp !== 'other' ? `your ${bp}` : 'your';
}

export function bodyPartLabel(bp: string | null | undefined): string {
  return bp && bp !== 'other' ? bp : '';
}
