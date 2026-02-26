import { describe, expect, it } from 'vitest';
import { resolveTournamentRuntimeConfig } from '@/lib/coach/runtime';

describe('tournament runtime config', () => {
  it('uses safe defaults when env is unset', () => {
    const cfg = resolveTournamentRuntimeConfig({} as NodeJS.ProcessEnv);
    expect(cfg.enabled).toBe(false);
    expect(cfg.requestTimeoutMs).toBe(1200);
    expect(cfg.maxRetries).toBe(1);
  });

  it('rejects invalid bounds', () => {
    expect(() =>
      resolveTournamentRuntimeConfig({
        TOURNAMENT_VARIANT_ENABLED: 'true',
        TOURNAMENT_REQUEST_TIMEOUT_MS: '100',
      } as NodeJS.ProcessEnv)
    ).toThrow(/TOURNAMENT_REQUEST_TIMEOUT_MS/);
  });

  it('accepts valid custom config', () => {
    const cfg = resolveTournamentRuntimeConfig({
      TOURNAMENT_VARIANT_ENABLED: 'true',
      TOURNAMENT_REQUEST_TIMEOUT_MS: '900',
      TOURNAMENT_MAX_RETRIES: '2',
      TOURNAMENT_RATE_LIMIT_MAX: '10',
    } as NodeJS.ProcessEnv);

    expect(cfg.enabled).toBe(true);
    expect(cfg.requestTimeoutMs).toBe(900);
    expect(cfg.maxRetries).toBe(2);
    expect(cfg.rateLimitMax).toBe(10);
  });
});
