import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { generateEmbeddings, toVectorLiteral } from '@/lib/search/embeddings';

export type SemanticChunkMatch = {
  chunk_id: string;
  document_id: string;
  page_start: number | null;
  page_end: number | null;
  text: string;
  similarity: number;
  source: 'vector' | 'text';
};

type SearchParams = {
  universeId: string;
  query: string;
  topK?: number;
};

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ');
}

export async function semanticSearchChunks({
  universeId,
  query,
  topK = 5,
}: SearchParams): Promise<SemanticChunkMatch[]> {
  const db = getSupabaseServerClient();
  if (!db) return [];

  const cleanQuery = normalizeQuery(query);
  if (!cleanQuery) return [];

  const [queryEmbedding] = await generateEmbeddings([cleanQuery]);

  if (queryEmbedding) {
    const { data: vectorMatches, error } = await db.rpc('match_chunks', {
      p_universe_id: universeId,
      p_query_embedding: toVectorLiteral(queryEmbedding),
      p_match_count: topK,
    });

    if (!error && Array.isArray(vectorMatches) && vectorMatches.length > 0) {
      return vectorMatches.map((row) => ({
        chunk_id: row.chunk_id,
        document_id: row.document_id,
        page_start: row.page_start,
        page_end: row.page_end,
        text: row.text,
        similarity: Number(row.similarity ?? 0),
        source: 'vector',
      }));
    }
  }

  const ilike = `%${cleanQuery.replace(/%/g, '')}%`;
  const { data: textMatches } = await db
    .from('chunks')
    .select('id, document_id, page_start, page_end, text')
    .eq('universe_id', universeId)
    .eq('archived', false)
    .ilike('text', ilike)
    .limit(topK);

  return (textMatches ?? []).map((row) => ({
    chunk_id: row.id,
    document_id: row.document_id,
    page_start: row.page_start,
    page_end: row.page_end,
    text: row.text,
    similarity: 0,
    source: 'text',
  }));
}
