import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CoachRequestSchema, CoachResponseSchema } from '@/lib/coach/contract';
import { buildCoachResponse } from '@/lib/coach/service';

type Fixture = {
  name: string;
  request: unknown;
};

const fixturePath = join(process.cwd(), 'tests/fixtures/coach-core.golden.json');
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf-8')) as Fixture[];

console.log('=== Coach Core v1 Demo ===');
for (const fixture of fixtures) {
  const request = CoachRequestSchema.parse(fixture.request);
  const response = buildCoachResponse(request);
  CoachResponseSchema.parse(response);

  console.log(`\n[${fixture.name}]`);
  console.log(`mode=${response.mode} archetype=${response.archetype ?? 'null'} confidence=${response.confidence}`);
  console.log(`fallbackReason=${response.fallbackReason ?? 'null'}`);
  console.log(`plan=${response.plan.title}`);
  for (const [idx, step] of response.plan.steps.entries()) {
    console.log(`  ${idx + 1}. ${step}`);
  }
}

console.log('\nDemo complete: all fixtures produced schema-valid deterministic outputs.');
