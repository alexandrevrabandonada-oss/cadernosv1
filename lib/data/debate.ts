import 'server-only';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type RecentQuestion = {
  id: string;
  question: string;
  createdAt: string;
};

type UniverseContext = {
  id: string;
  title: string;
};

export type DocViewData = {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
  sourceUrl: string | null;
  storagePath: string | null;
  status: 'uploaded' | 'processed' | 'link_only' | 'error';
  signedUrl: string | null;
};

export type DocThreadCitation = {
  citationId: string;
  threadId: string;
  chunkId: string;
  docId: string;
  docTitle: string;
  year: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  quote: string;
  quoteStart: number | null;
  quoteEnd: number | null;
  highlightToken: string | null;
  chunkText: string;
};

export async function getUniverseContextBySlug(slug: string): Promise<UniverseContext | null> {
  const db = getSupabaseServerClient();
  if (!db) return null;

  const { data } = await db.from('universes').select('id, title').eq('slug', slug).maybeSingle();
  if (!data) return null;
  return { id: data.id, title: data.title };
}

export async function getRecentQuestions(universeId: string, limit = 8): Promise<RecentQuestion[]> {
  const db = getSupabaseServerClient();
  if (!db) return [];

  const { data } = await db
    .from('qa_threads')
    .select('id, question, created_at')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((item) => ({
    id: item.id,
    question: item.question,
    createdAt: item.created_at,
  }));
}

export async function getDocumentViewData(slug: string, docId: string): Promise<DocViewData | null> {
  const universe = await getUniverseContextBySlug(slug);
  if (!universe) return null;

  const db = getSupabaseServerClient();
  if (!db) return null;

  const { data: doc } = await db
    .from('documents')
    .select('id, title, authors, year, source_url, storage_path, status, is_deleted')
    .eq('id', docId)
    .eq('universe_id', universe.id)
    .maybeSingle();

  if (!doc || doc.is_deleted) return null;

  let signedUrl: string | null = null;
  const service = getSupabaseServiceRoleClient();
  if (service && doc.storage_path) {
    const { data: signed } = await service.storage.from('cv-docs').createSignedUrl(doc.storage_path, 60 * 30);
    signedUrl = signed?.signedUrl ?? null;
  }

  return {
    id: doc.id,
    title: doc.title,
    authors: doc.authors,
    year: doc.year,
    sourceUrl: doc.source_url,
    storagePath: doc.storage_path,
    status: doc.status,
    signedUrl,
  };
}

export async function getThreadCitationsForDocument(
  slug: string,
  docId: string,
  threadId: string,
): Promise<DocThreadCitation[]> {
  const universe = await getUniverseContextBySlug(slug);
  if (!universe) return [];

  const db = getSupabaseServerClient();
  if (!db) return [];

  const { data: thread } = await db
    .from('qa_threads')
    .select('id, universe_id')
    .eq('id', threadId)
    .eq('universe_id', universe.id)
    .maybeSingle();
  if (!thread) return [];

  const [{ data: doc }, { data: rows }] = await Promise.all([
    db
      .from('documents')
      .select('id, title, year, is_deleted')
      .eq('id', docId)
      .eq('universe_id', universe.id)
      .maybeSingle(),
    db
      .from('citations')
      .select('id, qa_thread_id, chunk_id, quote, page_start, page_end, quote_start, quote_end, highlight_token')
      .eq('qa_thread_id', threadId)
      .order('id', { ascending: true }),
  ]);

  if (!doc || doc.is_deleted) return [];

  const chunkIds = Array.from(new Set((rows ?? []).map((row) => row.chunk_id)));
  if (chunkIds.length === 0) return [];

  const { data: chunks } = await db
    .from('chunks')
    .select('id, document_id, text')
    .eq('universe_id', universe.id)
    .eq('document_id', docId)
    .in('id', chunkIds);

  const chunkById = new Map((chunks ?? []).map((chunk) => [chunk.id, chunk]));

  return (rows ?? [])
    .map((row) => {
      const chunk = chunkById.get(row.chunk_id);
      if (!chunk) return null;
      return {
        citationId: row.id,
        threadId: row.qa_thread_id,
        chunkId: row.chunk_id,
        docId: doc.id,
        docTitle: doc.title,
        year: doc.year,
        pageStart: row.page_start,
        pageEnd: row.page_end,
        quote: row.quote,
        quoteStart: row.quote_start,
        quoteEnd: row.quote_end,
        highlightToken: row.highlight_token,
        chunkText: chunk.text,
      } satisfies DocThreadCitation;
    })
    .filter((item): item is DocThreadCitation => Boolean(item));
}
