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

export function bodyPartPhrase(bp: string | null | undefined): string {
  return bp && bp !== 'other' ? `your ${bp}` : 'your';
}

export function bodyPartLabel(bp: string | null | undefined): string {
  return bp && bp !== 'other' ? bp : '';
}
