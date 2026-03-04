import { describe, expect, it } from 'vitest';
import { rerankCandidates } from '@/lib/search/rerank';
import type { RetrieveCandidate } from '@/lib/search/retrieve';

function makeCandidate(input: Partial<RetrieveCandidate> & Pick<RetrieveCandidate, 'chunk_id' | 'document_id'>) {
  return {
    chunk_id: input.chunk_id,
    document_id: input.document_id,
    page_start: input.page_start ?? 1,
    page_end: input.page_end ?? 1,
    text: input.text ?? `Trecho ${input.chunk_id}`,
    score: input.score ?? 0.5,
    source: input.source ?? 'vector',
    document_title: input.document_title ?? `Doc ${input.document_id}`,
    year: input.year ?? 2020,
  } satisfies RetrieveCandidate;
}

describe('rerankCandidates', () => {
  it('mantem diversidade e limite por documento quando ha 2+ docs', () => {
    const candidates: RetrieveCandidate[] = [
      makeCandidate({ chunk_id: 'c1', document_id: 'd1', score: 0.95, year: 2022 }),
      makeCandidate({ chunk_id: 'c2', document_id: 'd1', score: 0.92, year: 2022 }),
      makeCandidate({ chunk_id: 'c3', document_id: 'd1', score: 0.9, year: 2022 }),
      makeCandidate({ chunk_id: 'c4', document_id: 'd2', score: 0.89, year: 2024 }),
      makeCandidate({ chunk_id: 'c5', document_id: 'd2', score: 0.87, year: 2024 }),
      makeCandidate({ chunk_id: 'c6', document_id: 'd3', score: 0.85, year: 2023 }),
    ];

    const result = rerankCandidates(candidates, {
      k: 6,
      maxPerDoc: 2,
      minDistinctDocs: 2,
      focusTop: 6,
    });

    const byDoc = result.selected.reduce<Map<string, number>>((acc, item) => {
      acc.set(item.document_id, (acc.get(item.document_id) ?? 0) + 1);
      return acc;
    }, new Map());

    expect(result.distinctDocsAvailable).toBeGreaterThanOrEqual(2);
    expect(result.distinctDocsSelected).toBeGreaterThanOrEqual(2);
    expect(Math.max(...Array.from(byDoc.values()))).toBeLessThanOrEqual(2);
  });

  it('nao falha quando so existe um documento', () => {
    const candidates: RetrieveCandidate[] = [
      makeCandidate({ chunk_id: 'c1', document_id: 'd1', score: 0.8 }),
      makeCandidate({ chunk_id: 'c2', document_id: 'd1', score: 0.7 }),
      makeCandidate({ chunk_id: 'c3', document_id: 'd1', score: 0.6 }),
    ];

    const result = rerankCandidates(candidates, { k: 3, maxPerDoc: 3, minDistinctDocs: 2, focusTop: 3 });
    expect(result.selected).toHaveLength(3);
    expect(result.distinctDocsAvailable).toBe(1);
    expect(result.distinctDocsSelected).toBe(1);
  });
});
