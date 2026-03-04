import 'server-only';
import { semanticSearchChunks } from '@/lib/search/semantic';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type RetrieveCandidate = {
  chunk_id: string;
  document_id: string;
  page_start: number | null;
  page_end: number | null;
  text: string;
  score: number;
  source: 'vector' | 'text';
  document_title: string;
  year: number | null;
};

export async function retrieveCandidates(
  universeId: string,
  question: string,
  options: { k?: number } = {},
): Promise<RetrieveCandidate[]> {
  const k = options.k ?? 20;
  const matches = await semanticSearchChunks({
    universeId,
    query: question,
    topK: k,
  });
  if (matches.length === 0) return [];

  const db = getSupabaseServerClient();
  if (!db) {
    return matches.map((match) => ({
      chunk_id: match.chunk_id,
      document_id: match.document_id,
      page_start: match.page_start,
      page_end: match.page_end,
      text: match.text,
      score: match.similarity ?? 0,
      source: match.source,
      document_title: 'Documento',
      year: null,
    }));
  }

  const docIds = Array.from(new Set(matches.map((item) => item.document_id)));
  const { data: docs } = await db
    .from('documents')
    .select('id, title, year')
    .in('id', docIds);

  const docById = new Map((docs ?? []).map((doc) => [doc.id, doc]));
  return matches.map((match) => {
    const doc = docById.get(match.document_id);
    return {
      chunk_id: match.chunk_id,
      document_id: match.document_id,
      page_start: match.page_start,
      page_end: match.page_end,
      text: match.text,
      score: match.similarity ?? 0,
      source: match.source,
      document_title: doc?.title ?? 'Documento sem titulo',
      year: doc?.year ?? null,
    } satisfies RetrieveCandidate;
  });
}
