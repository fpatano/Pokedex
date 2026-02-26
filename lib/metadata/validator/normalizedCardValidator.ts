import { normalizedCardV1Schema, type NormalizedCardV1 } from '@/lib/metadata/schema/normalizedCardV1';

export const NormalizedCardErrorCode = {
  MISSING_ID: 'MISSING_ID',
  MISSING_NAME: 'MISSING_NAME',
  INVALID_ATTACK_NAME: 'INVALID_ATTACK_NAME',
  SCHEMA_VIOLATION: 'SCHEMA_VIOLATION',
} as const;

export type NormalizedCardErrorCode = (typeof NormalizedCardErrorCode)[keyof typeof NormalizedCardErrorCode];

export type NormalizedCardValidationError = {
  code: NormalizedCardErrorCode;
  message: string;
  path: string;
};

export type NormalizedCardValidationResult =
  | { ok: true; card: NormalizedCardV1; errors: [] }
  | { ok: false; card: NormalizedCardV1; errors: NormalizedCardValidationError[] };

export function validateNormalizedCard(card: NormalizedCardV1): NormalizedCardValidationResult {
  const errors: NormalizedCardValidationError[] = [];

  if (!card.id.trim()) {
    errors.push({ code: NormalizedCardErrorCode.MISSING_ID, message: 'Card id is required', path: 'id' });
  }

  if (!card.name.trim()) {
    errors.push({ code: NormalizedCardErrorCode.MISSING_NAME, message: 'Card name is required', path: 'name' });
  }

  card.attacks.forEach((attack, index) => {
    if (!attack.name.trim()) {
      errors.push({
        code: NormalizedCardErrorCode.INVALID_ATTACK_NAME,
        message: 'Attack name is required',
        path: `attacks[${index}].name`,
      });
    }
  });

  const parsed = normalizedCardV1Schema.safeParse(card);
  if (!parsed.success) {
    errors.push({
      code: NormalizedCardErrorCode.SCHEMA_VIOLATION,
      message: parsed.error.issues.map((issue) => issue.message).join('; '),
      path: parsed.error.issues[0]?.path.join('.') ?? '',
    });
  }

  if (errors.length > 0) {
    return { ok: false, card, errors };
  }

  return { ok: true, card, errors: [] };
}
