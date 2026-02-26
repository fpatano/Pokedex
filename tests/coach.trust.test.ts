import { describe, expect, it } from 'vitest';
import { buildCoachResponse, normalizeIntake } from '@/lib/coach/service';
import { COACH_CORE_CONTRACT_VERSION } from '@/lib/coach/contract';
import { buildMissingSinglesExport, toConfidenceLabel } from '@/lib/coach/trust';

describe('coach trust layer (M3 additive)', () => {
  it('maps confidence label boundaries deterministically', () => {
    expect(toConfidenceLabel(0.75)).toBe('high');
    expect(toConfidenceLabel(0.74)).toBe('medium');
    expect(toConfidenceLabel(0.45)).toBe('medium');
    expect(toConfidenceLabel(0.44)).toBe('low');
  });

  it('builds deterministic missing-singles export with stable order + dedupe', () => {
    const canonical = normalizeIntake({ objective: '   ', favoriteTypes: [' ', ''] });
    const first = buildMissingSinglesExport(canonical, 0.3);
    const second = buildMissingSinglesExport(canonical, 0.3);

    expect(first).toStrictEqual(second);
    expect(first.items.map((item) => item.id)).toStrictEqual(['objective', 'favoriteTypes']);
    expect(new Set(first.items.map((item) => item.id)).size).toBe(first.items.length);
  });

  it('returns empty missing-singles export for complete critical input', () => {
    const response = buildCoachResponse({
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: { objective: 'quick damage plan', favoriteTypes: ['Fire'] },
    });

    expect(response.missingSinglesExport.items).toStrictEqual([]);
  });

  it('backward compatibility snapshot: legacy fields remain stable with additive trust fields', () => {
    const response = buildCoachResponse({
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: { objective: 'control draw lock', pace: 'control' },
    });

    expect(response).toMatchObject({
      contractVersion: 'coach-core.v1',
      mode: 'coach',
      confidence: expect.any(Number),
      archetype: 'CONTROL_ENGINE',
      fallbackReason: null,
      plan: {
        horizon: 'NEXT_7_DAYS',
      },
    });
    expect(response.confidenceLabel).toMatch(/^(high|medium|low)$/);
  });
});
