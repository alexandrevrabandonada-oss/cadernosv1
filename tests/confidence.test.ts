import { describe, expect, it } from 'vitest';
import { computeConfidence } from '@/lib/quality/confidence';

describe('computeConfidence', () => {
  it('retorna forte quando sinais sao altos', () => {
    const result = computeConfidence({
      mode: 'strict_ok',
      docsDistinct: 4,
      chunksUsed: 8,
      citationsCount: 6,
      avgDocQuality: 84,
      methodKinds: ['review', 'observational'],
      citationsByDoc: new Map([
        ['d1', 2],
        ['d2', 2],
        ['d3', 1],
        ['d4', 1],
      ]),
    });

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.label).toBe('forte');
  });

  it('retorna fraca para insufficient com base concentrada', () => {
    const result = computeConfidence({
      mode: 'insufficient',
      docsDistinct: 1,
      chunksUsed: 1,
      citationsCount: 1,
      avgDocQuality: 48,
      methodKinds: ['unknown'],
      citationsByDoc: new Map([['d1', 1]]),
    });

    expect(result.score).toBeLessThan(45);
    expect(result.label).toBe('fraca');
    expect(result.limitations.some((item) => item.toLowerCase().includes('concentrada'))).toBeTruthy();
  });
});
