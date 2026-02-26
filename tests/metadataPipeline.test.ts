import { describe, expect, it } from 'vitest';
import { mapTcgdexToNormalizedDraft, resolveTcgdexImageUrl } from '@/lib/metadata/adapter/tcgdexMapper';
import { normalizeCardMetadata } from '@/lib/metadata/normalizer/metadataNormalizer';
import { validateNormalizedCard, NormalizedCardErrorCode } from '@/lib/metadata/validator/normalizedCardValidator';
import { runDexter40Evaluation } from '@/lib/metadata/eval/dexter40Harness';

describe('metadata pipeline', () => {
  it('maps + normalizes tcgdex cards', () => {
    const draft = mapTcgdexToNormalizedDraft({
      id: 'x-1',
      name: '  Charizard  ',
      image: 'https://assets.tcgdex.net/en/lc/lc/5',
      category: 'Pokemon',
      types: ['Fire'],
      hp: 180,
      attacks: [{ name: undefined, damage: 150, effect: 'Huge hit' }],
    });

    const normalized = normalizeCardMetadata(draft);
    expect(normalized.name).toBe('Charizard');
    expect(normalized.image).toBe('https://assets.tcgdex.net/en/lc/lc/5/high.webp');
    expect(normalized.attacks[0]?.name).toBe('Attack');
    expect(normalized.hp).toBe('180');
  });

  it('produces deterministic validation errors', () => {
    const result = validateNormalizedCard(
      normalizeCardMetadata({ id: '', name: '', attacks: [{ name: '' }] })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.code)).toContain(NormalizedCardErrorCode.MISSING_ID);
    expect(result.errors.map((e) => e.code)).toContain(NormalizedCardErrorCode.MISSING_NAME);
  });

  it('keeps variant image URLs unchanged', () => {
    expect(resolveTcgdexImageUrl('https://assets.tcgdex.net/en/lc/lc/5/high.webp')).toContain('high.webp');
  });

  it('passes dexter40 regression harness', () => {
    const result = runDexter40Evaluation();
    expect(result.totalQueries).toBe(40);
    expect(result.queryPassRate).toBeGreaterThanOrEqual(0.9);
  });
});
