import type { NormalizedCardV1 } from '@/lib/metadata/schema/normalizedCardV1';

function normalizeString(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => normalizeString(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeHp(hp: unknown): string | undefined {
  const value = normalizeString(hp);
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return String(Number(value));
  return value;
}

export function normalizeCardMetadata(draft: Partial<NormalizedCardV1>): NormalizedCardV1 {
  return {
    id: normalizeString(draft.id) ?? '',
    name: normalizeString(draft.name) ?? '',
    image: normalizeString(draft.image) ?? '',
    setName: normalizeString(draft.setName) ?? 'Unknown Set',
    supertype: normalizeString(draft.supertype) ?? 'Unknown',
    types: normalizeArray(draft.types),
    hp: normalizeHp(draft.hp),
    abilityText: normalizeString(draft.abilityText),
    attacks: Array.isArray(draft.attacks)
      ? draft.attacks.map((attack) => ({
          name: normalizeString(attack?.name) ?? 'Attack',
          damage: normalizeString(attack?.damage),
          text: normalizeString(attack?.text),
        }))
      : [],
  };
}
