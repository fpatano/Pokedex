import { describe, expect, it } from 'vitest';
import { shouldApplyResponse } from '@/lib/requestGuard';

describe('shouldApplyResponse', () => {
  it('allows latest request response', () => {
    expect(shouldApplyResponse(4, 4)).toBe(true);
  });

  it('rejects stale request response', () => {
    expect(shouldApplyResponse(3, 4)).toBe(false);
  });
});
