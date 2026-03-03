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
  status: 'uploaded' | 'processed';
  signedUrl: string | null;
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
