import { describe, expect, it } from 'vitest';
import {
  CoachRequestSchema,
  CoachResponseSchema,
  COACH_CORE_CONTRACT_VERSION,
} from '@/lib/coach/contract';
import { buildCoachResponse } from '@/lib/coach/service';

describe('Coach Core contract lock (M2)', () => {
  it('accepts sparse valid intake and rejects invalid shapes', () => {
    const valid = CoachRequestSchema.safeParse({
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: {
        objective: 'quick pressure damage plan',
        favoriteTypes: ['Fire'],
      },
    });
    expect(valid.success).toBe(true);

    const invalid = CoachRequestSchema.safeParse({
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: {
        objective: '',
      },
    });
    expect(invalid.success).toBe(false);
  });

  it('returns exactly one archetype + one plan on successful resolution', () => {
    const response = buildCoachResponse({
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: {
        objective: 'fast attack damage with quick setup',
        pace: 'fast',
        favoriteTypes: ['Lightning'],
      },
    });

    expect(response.mode).toBe('coach');
    expect(response.archetype).not.toBeNull();
    expect(response.plan.horizon).toBe('NEXT_7_DAYS');
    expect(response.plan.steps).toHaveLength(3);
    expect(CoachResponseSchema.parse(response)).toBeTruthy();
  });

  it('triggers fallback for missing critical input', () => {
    const response = buildCoachResponse({
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: {},
    });

    expect(response.mode).toBe('fallback');
    expect(response.fallbackReason).toBe('MISSING_CRITICAL_INPUT');
    expect(response.archetype).toBeNull();
    expect(CoachResponseSchema.parse(response)).toBeTruthy();
  });

  it('deprecates LOW_CONFIDENCE from the contract (only missing critical input falls back)', () => {
    const response = buildCoachResponse({
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: {
        objective: 'deck help',
      },
    });

    expect(response.mode).toBe('coach');
    expect(response.fallbackReason).toBeNull();
  });

  it('is deterministic for same payload/config', () => {
    const request = {
      contractVersion: COACH_CORE_CONTRACT_VERSION,
      intake: {
        objective: 'control draw lock plan',
        pace: 'control' as const,
        budget: 'mid' as const,
        experience: 'advanced' as const,
      },
    };

    const first = buildCoachResponse(request);
    const second = buildCoachResponse(request);

    expect(second).toStrictEqual(first);
  });
});
