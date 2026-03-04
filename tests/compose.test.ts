import { describe, expect, it } from 'vitest';
import { composeAnswer } from '@/lib/answer/compose';
import type { RetrieveCandidate } from '@/lib/search/retrieve';

const candidate: RetrieveCandidate = {
  chunk_id: 'c1',
  document_id: 'd1',
  page_start: 1,
  page_end: 1,
  text: 'Estudo observou reducao de sintomas em grupo acompanhado.',
  score: 0.88,
  source: 'vector',
  document_title: 'Doc 1',
  year: 2024,
};

describe('composeAnswer', () => {
  it('gera secoes padrao no modo strict_ok', () => {
    const output = composeAnswer({
      question: 'Qual o efeito?',
      candidates: [candidate],
      insufficient: false,
    });

    expect(output).toContain('## Achados');
    expect(output).toContain('## Limitacoes');
    expect(output).toContain('## Citacoes');
  });

  it('nao quebra e sinaliza insuficiencia', () => {
    const output = composeAnswer({
      question: 'Pergunta',
      candidates: [],
      insufficient: true,
      insufficientReason: 'poucos_trechos_relevantes',
      suggestions: ['Termo A', 'Termo B'],
    });

    expect(output).toContain('Modo estrito ativo');
    expect(output).toContain('Sugestoes de refinamento');
  });
});
