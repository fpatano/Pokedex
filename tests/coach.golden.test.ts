import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CoachRequestSchema, CoachResponseSchema } from '@/lib/coach/contract';
import { buildCoachResponse } from '@/lib/coach/service';

type GoldenCase = {
  name: string;
  request: unknown;
  expected: {
    mode: 'coach' | 'fallback';
    archetype: string | null;
    fallbackReason: string | null;
    planHorizon: 'NEXT_7_DAYS';
  };
};

const fixturePath = join(process.cwd(), 'tests/fixtures/coach-core.golden.json');
const cases: GoldenCase[] = JSON.parse(readFileSync(fixturePath, 'utf-8'));

describe('Coach Core golden fixtures', () => {
  it('passes schema contract and expected outputs for all fixtures', () => {
    for (const testCase of cases) {
      const parsed = CoachRequestSchema.safeParse(testCase.request);
      expect(parsed.success, testCase.name).toBe(true);
      if (!parsed.success) continue;

      const response = buildCoachResponse(parsed.data);
      expect(CoachResponseSchema.parse(response), testCase.name).toBeTruthy();

      expect(response.mode, testCase.name).toBe(testCase.expected.mode);
      expect(response.archetype, testCase.name).toBe(testCase.expected.archetype);
      expect(response.fallbackReason, testCase.name).toBe(testCase.expected.fallbackReason);
      expect(response.plan.horizon, testCase.name).toBe(testCase.expected.planHorizon);
    }
  });

  it('is deterministic across fixture corpus', () => {
    for (const testCase of cases) {
      const parsed = CoachRequestSchema.parse(testCase.request);
      const first = buildCoachResponse(parsed);
      const second = buildCoachResponse(parsed);
      expect(second, testCase.name).toStrictEqual(first);
    }
  });
});
