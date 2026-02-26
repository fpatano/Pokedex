import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCoachResponse } from '@/lib/coach/service';
import { CoachRequestSchema } from '@/lib/coach/contract';

type TrustFixture = {
  name: string;
  request: unknown;
  expected: {
    confidenceLabel: 'high' | 'medium' | 'low';
    missingSinglesExport: {
      format: 'coach-missing-singles.v1';
      generatedFromContract: 'coach-core.v1';
      ids: Array<'objective' | 'favoriteTypes'>;
    };
  };
};

describe('coach trust integration fixture', () => {
  it('matches fixture contract for deterministic trust export', () => {
    const fixturePath = join(process.cwd(), 'tests/fixtures/coach-trust.integration.json');
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as TrustFixture;
    const request = CoachRequestSchema.parse(fixture.request);

    const response = buildCoachResponse(request);

    expect(response.confidenceLabel, fixture.name).toBe(fixture.expected.confidenceLabel);
    expect(response.missingSinglesExport.format, fixture.name).toBe(fixture.expected.missingSinglesExport.format);
    expect(response.missingSinglesExport.generatedFromContract, fixture.name).toBe(
      fixture.expected.missingSinglesExport.generatedFromContract
    );
    expect(response.missingSinglesExport.items.map((item) => item.id), fixture.name).toStrictEqual(
      fixture.expected.missingSinglesExport.ids
    );
  });
});
