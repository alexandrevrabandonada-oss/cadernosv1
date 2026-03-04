import 'server-only';
import type { RetrieveCandidate } from '@/lib/search/retrieve';

type RerankOptions = {
  k?: number;
  maxPerDoc?: number;
  minDistinctDocs?: number;
  focusTop?: number;
};

export type RerankResult = {
  selected: RetrieveCandidate[];
  distinctDocsAvailable: number;
  distinctDocsSelected: number;
};

function sortCandidates(candidates: RetrieveCandidate[]) {
  return [...candidates].sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (Math.abs(scoreDiff) > 0.02) return scoreDiff;
    return (b.year ?? 0) - (a.year ?? 0);
  });
}

export function rerankCandidates(
  candidates: RetrieveCandidate[],
  options: RerankOptions = {},
): RerankResult {
  const k = options.k ?? 8;
  const maxPerDoc = options.maxPerDoc ?? 3;
  const minDistinctDocs = options.minDistinctDocs ?? 2;
  const focusTop = options.focusTop ?? 6;

  const sorted = sortCandidates(candidates);
  const distinctAvailable = new Set(sorted.map((item) => item.document_id)).size;
  const selected: RetrieveCandidate[] = [];
  const perDoc = new Map<string, number>();
  const usedChunk = new Set<string>();

  if (distinctAvailable >= minDistinctDocs) {
    for (const candidate of sorted) {
      if (selected.length >= minDistinctDocs) break;
      if (usedChunk.has(candidate.chunk_id)) continue;
      if (perDoc.has(candidate.document_id)) continue;
      selected.push(candidate);
      usedChunk.add(candidate.chunk_id);
      perDoc.set(candidate.document_id, 1);
    }
  }

  for (const candidate of sorted) {
    if (selected.length >= k) break;
    if (usedChunk.has(candidate.chunk_id)) continue;
    const docCount = perDoc.get(candidate.document_id) ?? 0;
    if (docCount >= maxPerDoc) continue;
    selected.push(candidate);
    usedChunk.add(candidate.chunk_id);
    perDoc.set(candidate.document_id, docCount + 1);
  }

  const topSlice = selected.slice(0, Math.min(focusTop, selected.length));
  const distinctTop = new Set(topSlice.map((item) => item.document_id)).size;
  if (distinctAvailable >= minDistinctDocs && distinctTop < minDistinctDocs) {
    const alt = sorted.find(
      (item) =>
        !topSlice.some((chosen) => chosen.chunk_id === item.chunk_id) &&
        !topSlice.some((chosen) => chosen.document_id === item.document_id),
    );
    if (alt) {
      const replaceIndex = Math.max(0, Math.min(focusTop - 1, selected.length - 1));
      selected[replaceIndex] = alt;
    }
  }

  const deduped = Array.from(new Map(selected.map((item) => [item.chunk_id, item])).values()).slice(0, k);
  return {
    selected: deduped,
    distinctDocsAvailable: distinctAvailable,
    distinctDocsSelected: new Set(deduped.map((item) => item.document_id)).size,
  };
}
