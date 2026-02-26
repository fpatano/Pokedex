import { describe, expect, it } from 'vitest';
import { resolveTcgdexImageUrl } from '@/lib/pokemonApi';

describe('resolveTcgdexImageUrl', () => {
  it('appends /high.webp for tcgdex base image paths', () => {
    expect(resolveTcgdexImageUrl('https://assets.tcgdex.net/en/lc/lc/5')).toBe('https://assets.tcgdex.net/en/lc/lc/5/high.webp');
  });

  it('normalizes trailing slash base path to /high.webp', () => {
    expect(resolveTcgdexImageUrl('https://assets.tcgdex.net/en/lc/lc/5/')).toBe('https://assets.tcgdex.net/en/lc/lc/5/high.webp');
  });

  it('keeps urls with an existing extension unchanged', () => {
    expect(resolveTcgdexImageUrl('https://assets.tcgdex.net/en/lc/lc/5.png')).toBe('https://assets.tcgdex.net/en/lc/lc/5.png');
  });

  it('keeps urls with existing variant unchanged', () => {
    expect(resolveTcgdexImageUrl('https://assets.tcgdex.net/en/lc/lc/5/high.webp')).toBe('https://assets.tcgdex.net/en/lc/lc/5/high.webp');
  });

  it('returns empty string for empty or undefined image', () => {
    expect(resolveTcgdexImageUrl('')).toBe('');
    expect(resolveTcgdexImageUrl(undefined)).toBe('');
  });
});
