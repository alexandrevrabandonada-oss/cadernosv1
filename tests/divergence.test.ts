import { describe, expect, it } from 'vitest';
import { detectDivergence } from '@/lib/quality/divergence';

describe('detectDivergence', () => {
  it('marca divergence true com sinais mistos em docs distintos', () => {
    const result = detectDivergence({
      question: 'Existe associacao entre exposicao e desfecho?',
      docsDistinct: 2,
      mode: 'strict_ok',
      limitations: [],
      chunks: [
        {
          documentId: 'd1',
          text: 'Houve associacao significativa entre exposicao e desfecho clinico.',
        },
        {
          documentId: 'd2',
          text: 'Nao houve associacao e os resultados foram inconclusivos.',
        },
      ],
    });

    expect(result.flag).toBe(true);
    expect(result.summary).toBeTruthy();
  });

  it('mantem false para sinais homogeneos', () => {
    const result = detectDivergence({
      question: 'Existe associacao entre exposicao e desfecho?',
      docsDistinct: 2,
      mode: 'strict_ok',
      limitations: [],
      chunks: [
        {
          documentId: 'd1',
          text: 'Houve associacao significativa entre exposicao e desfecho clinico.',
        },
        {
          documentId: 'd2',
          text: 'A evidencia de associacao foi consistente no periodo.',
        },
      ],
    });

    expect(result.flag).toBe(false);
    expect(result.summary).toBeNull();
  });
});
