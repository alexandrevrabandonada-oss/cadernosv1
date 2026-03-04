import { describe, expect, it } from 'vitest';
import { isUniversePublished } from '@/lib/data/universes';

describe('isUniversePublished', () => {
  it('retorna true com published_at preenchido', () => {
    expect(isUniversePublished({ published_at: '2026-03-01T00:00:00Z', published: null })).toBe(true);
  });

  it('retorna true com flag published legada', () => {
    expect(isUniversePublished({ published_at: null, published: true })).toBe(true);
  });

  it('retorna false quando nao publicado', () => {
    expect(isUniversePublished({ published_at: null, published: false })).toBe(false);
  });
});
