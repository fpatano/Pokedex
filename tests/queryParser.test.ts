import { describe, expect, it } from 'vitest';
import { buildPokemonTcgQuery } from '@/lib/queryParser';

describe('buildPokemonTcgQuery', () => {
  it('handles type + keyword + number query', () => {
    const q = buildPokemonTcgQuery('fire burn 120');
    expect(q).toContain('types:fire');
    expect(q).toContain('abilities.text:*burn*');
    expect(q).toContain('attacks.damage:*120*');
  });

  it('adds pokemon + attack constraints for attack-damage intent', () => {
    const q = buildPokemonTcgQuery('water type pokemon highest damage');
    expect(q).toContain('supertype:pokemon');
    expect(q).toContain('attacks.name:*');
    expect(q).toContain('types:water');
  });

  it('returns wildcard for empty input', () => {
    expect(buildPokemonTcgQuery('   ')).toBe('*');
  });
});
