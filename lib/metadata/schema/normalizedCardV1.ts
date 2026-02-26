import { z } from 'zod';

/**
 * Canonical normalized card contract.
 * Nullability policy (v1):
 * - Required fields are always present and never null.
 * - Optional scalar fields use `undefined` for missing values (never `null`).
 * - Optional collections default to empty arrays when omitted by upstream.
 */
export const NORMALIZED_CARD_SCHEMA_VERSION = 'v1' as const;

export const normalizedAttackV1Schema = z
  .object({
    name: z.string().min(1),
    damage: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
  })
  .strict();

export const normalizedCardV1Schema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    image: z.string().default(''),
    setName: z.string().min(1).default('Unknown Set'),
    supertype: z.string().min(1).default('Unknown'),
    types: z.array(z.string().min(1)).default([]),
    hp: z.string().min(1).optional(),
    abilityText: z.string().min(1).optional(),
    attacks: z.array(normalizedAttackV1Schema).default([]),
  })
  .strict();

export type NormalizedCardV1 = z.infer<typeof normalizedCardV1Schema>;
export type NormalizedAttackV1 = z.infer<typeof normalizedAttackV1Schema>;
