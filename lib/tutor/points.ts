import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type TutorPointEvidence = {
  id: string;
  title: string;
  summary: string;
  documentId: string | null;
  pageStart: number | null;
  pageEnd: number | null;
};

export async function getEvidenceMapByIds(evidenceIds: string[]) {
  const db = getSupabaseServiceRoleClient();
  if (!db || evidenceIds.length === 0) return new Map<string, TutorPointEvidence>();

  const uniqueIds = Array.from(new Set(evidenceIds.filter(Boolean)));
  const { data: evidencesRaw } = await db
    .from('evidences')
    .select('id, title, summary, document_id, chunk_id')
    .in('id', uniqueIds);
  const chunkIds = Array.from(new Set((evidencesRaw ?? []).map((ev) => ev.chunk_id).filter(Boolean)));
  const { data: chunksRaw } =
    chunkIds.length > 0
      ? await db.from('chunks').select('id, page_start, page_end').in('id', chunkIds)
      : { data: [] as Array<{ id: string; page_start: number | null; page_end: number | null }> };
  const chunkById = new Map((chunksRaw ?? []).map((chunk) => [chunk.id, chunk]));

  const out = new Map<string, TutorPointEvidence>();
  for (const evidence of evidencesRaw ?? []) {
    const chunk = evidence.chunk_id ? chunkById.get(evidence.chunk_id) : null;
    out.set(evidence.id, {
      id: evidence.id,
      title: evidence.title,
      summary: evidence.summary,
      documentId: evidence.document_id,
      pageStart: chunk?.page_start ?? null,
      pageEnd: chunk?.page_end ?? null,
    });
  }
  return out;
}
