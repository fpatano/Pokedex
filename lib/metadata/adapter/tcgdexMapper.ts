import { z } from 'zod';
import type { NormalizedCardV1 } from '@/lib/metadata/schema/normalizedCardV1';

export const tcgdexCardSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    image: z.string().optional(),
    set: z.object({ name: z.string().optional() }).optional(),
    category: z.string().optional(),
    types: z.array(z.string()).optional(),
    hp: z.union([z.string(), z.number()]).optional(),
    abilities: z.array(z.object({ effect: z.string().optional() })).optional(),
    attacks: z
      .array(
        z.object({
          name: z.string().optional(),
          damage: z.union([z.string(), z.number()]).optional(),
          effect: z.string().optional(),
        })
      )
      .optional(),
  })
  .strict();

export type TcgdexCard = z.infer<typeof tcgdexCardSchema>;

export function resolveTcgdexImageUrl(image?: string): string {
  if (!image) return '';
  if (/\.[a-z0-9]+$/i.test(image) || /\/(high|low)\.(webp|jpg|jpeg|png)$/i.test(image)) {
    return image;
  }
  return `${image.replace(/\/$/, '')}/high.webp`;
}

export function mapTcgdexToNormalizedDraft(card: TcgdexCard): Partial<NormalizedCardV1> {
  return {
    id: card.id,
    name: card.name,
    image: resolveTcgdexImageUrl(card.image),
    setName: card.set?.name,
    supertype: card.category,
    types: card.types,
    hp: card.hp != null ? String(card.hp) : undefined,
    abilityText: card.abilities?.[0]?.effect,
    attacks: (card.attacks ?? []).map((attack) => ({
      name: attack.name,
      damage: attack.damage != null ? String(attack.damage) : undefined,
      text: attack.effect,
    })) as NormalizedCardV1['attacks'],
  };
}
