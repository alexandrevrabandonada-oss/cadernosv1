import 'server-only';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type EvidenceEditorialStatus = 'draft' | 'review' | 'published' | 'rejected';

export type EvidenceQueueItem = {
  id: string;
  universeId: string;
  title: string;
  summary: string;
  status: EvidenceEditorialStatus;
  editorialNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  tags: string[];
  nodeId: string | null;
  nodeTitle: string | null;
  nodeSlug: string | null;
  documentId: string | null;
  documentTitle: string | null;
  year: number | null;
  pageStart: number | null;
  pageEnd: number | null;
};

export type EvidenceAuditItem = {
  id: string;
  evidenceId: string;
  universeId: string;
  action: string;
  fromStatus: EvidenceEditorialStatus | null;
  toStatus: EvidenceEditorialStatus | null;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
};

function clip(text: string, max = 240) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

export async function listEvidenceQueue(input: {
  universeId: string;
  status?: EvidenceEditorialStatus | 'all';
  nodeId?: string;
  q?: string;
  limit?: number;
  cursor?: number;
}) {
  await requireEditorOrAdmin();
  const db = getSupabaseServiceRoleClient();
  if (!db) return { items: [] as EvidenceQueueItem[], nextCursor: null, total: 0 };

  const limit = Math.max(1, Math.min(80, input.limit ?? 24));
  const offset = Math.max(0, input.cursor ?? 0);

  let query = db
    .from('evidences')
    .select(
      'id, universe_id, title, summary, status, editorial_note, published_at, created_at, updated_at, reviewed_by, tags, node_id, document_id, chunk_id',
    )
    .eq('universe_id', input.universeId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit + 80);

  if (input.status && input.status !== 'all') query = query.eq('status', input.status);
  if (input.nodeId) query = query.eq('node_id', input.nodeId);
  if (input.q?.trim()) query = query.or(`title.ilike.%${input.q.trim()}%,summary.ilike.%${input.q.trim()}%`);

  const { data: rows } = await query;
  const evidenceRows = rows ?? [];
  const docIds = Array.from(new Set(evidenceRows.map((row) => row.document_id).filter(Boolean)));
  const nodeIds = Array.from(new Set(evidenceRows.map((row) => row.node_id).filter(Boolean)));
  const chunkIds = Array.from(new Set(evidenceRows.map((row) => row.chunk_id).filter(Boolean)));

  const [{ data: docsRaw }, { data: nodesRaw }, { data: chunksRaw }] = await Promise.all([
    docIds.length > 0 ? db.from('documents').select('id, title, year').in('id', docIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string; year: number | null }> }),
    nodeIds.length > 0 ? db.from('nodes').select('id, title, slug').in('id', nodeIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string; slug: string }> }),
    chunkIds.length > 0 ? db.from('chunks').select('id, page_start, page_end').in('id', chunkIds) : Promise.resolve({ data: [] as Array<{ id: string; page_start: number | null; page_end: number | null }> }),
  ]);

  const docById = new Map((docsRaw ?? []).map((row) => [row.id, row]));
  const nodeById = new Map((nodesRaw ?? []).map((row) => [row.id, row]));
  const chunkById = new Map((chunksRaw ?? []).map((row) => [row.id, row]));

  const mapped = evidenceRows.map((row) => {
    const doc = row.document_id ? docById.get(row.document_id) : null;
    const node = row.node_id ? nodeById.get(row.node_id) : null;
    const chunk = row.chunk_id ? chunkById.get(row.chunk_id) : null;
    return {
      id: row.id,
      universeId: row.universe_id,
      title: row.title,
      summary: clip(row.summary ?? ''),
      status: row.status as EvidenceEditorialStatus,
      editorialNote: row.editorial_note ?? null,
      publishedAt: row.published_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedBy: row.reviewed_by ?? null,
      tags: (row.tags ?? []) as string[],
      nodeId: row.node_id ?? null,
      nodeTitle: node?.title ?? null,
      nodeSlug: node?.slug ?? null,
      documentId: row.document_id ?? null,
      documentTitle: doc?.title ?? null,
      year: doc?.year ?? null,
      pageStart: chunk?.page_start ?? null,
      pageEnd: chunk?.page_end ?? null,
    } satisfies EvidenceQueueItem;
  });

  const items = mapped.slice(0, limit);
  const nextCursor = mapped.length > limit ? offset + limit : null;
  return {
    items,
    nextCursor,
    total: mapped.length,
  };
}

export async function logEvidenceAction(input: {
  evidenceId: string;
  universeId: string;
  action: string;
  fromStatus?: EvidenceEditorialStatus | null;
  toStatus?: EvidenceEditorialStatus | null;
  note?: string | null;
}) {
  const session = await requireEditorOrAdmin();
  const db = getSupabaseServiceRoleClient();
  if (!db) return;

  await db.from('evidence_audit_logs').insert({
    evidence_id: input.evidenceId,
    universe_id: input.universeId,
    action: input.action,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    note: input.note?.trim() ? input.note.trim() : null,
    changed_by: session.userId,
  });
}

export async function updateEvidenceStatus(input: {
  evidenceId: string;
  toStatus: EvidenceEditorialStatus;
  note?: string;
  title?: string;
  summary?: string;
  nodeId?: string | null;
  tags?: string[];
}) {
  const session = await requireEditorOrAdmin();
  const db = getSupabaseServiceRoleClient();
  if (!db) return null;

  const { data: current } = await db
    .from('evidences')
    .select('id, universe_id, status, title, summary, node_id')
    .eq('id', input.evidenceId)
    .maybeSingle();
  if (!current) return null;

  const payload: Record<string, unknown> = {
    status: input.toStatus,
    reviewed_by: session.userId,
    editorial_note: input.note?.trim() ? input.note.trim() : null,
  };
  if (input.toStatus === 'published') payload.published_at = new Date().toISOString();
  if (input.toStatus !== 'published' && current.status === 'published') payload.published_at = null;
  if (input.title?.trim()) payload.title = input.title.trim();
  if (input.summary?.trim()) payload.summary = input.summary.trim();
  if (typeof input.nodeId !== 'undefined') payload.node_id = input.nodeId || null;
  if (Array.isArray(input.tags)) {
    payload.tags = Array.from(
      new Set(
        input.tags
          .map((item) => String(item).trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 12),
      ),
    );
  }

  await db.from('evidences').update(payload).eq('id', input.evidenceId);

  await db.from('evidence_audit_logs').insert({
    evidence_id: input.evidenceId,
    universe_id: current.universe_id,
    action: 'status_change',
    from_status: current.status,
    to_status: input.toStatus,
    note: input.note?.trim() ? input.note.trim() : null,
    changed_by: session.userId,
  });

  return {
    evidenceId: input.evidenceId,
    universeId: current.universe_id,
    fromStatus: current.status as EvidenceEditorialStatus,
    toStatus: input.toStatus,
  };
}

export async function getEvidenceAudit(evidenceId: string) {
  await requireEditorOrAdmin();
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as EvidenceAuditItem[];
  const { data } = await db
    .from('evidence_audit_logs')
    .select('id, evidence_id, universe_id, action, from_status, to_status, note, changed_by, created_at')
    .eq('evidence_id', evidenceId)
    .order('created_at', { ascending: false })
    .limit(60);
  return ((data ?? []) as Array<{
    id: string;
    evidence_id: string;
    universe_id: string;
    action: string;
    from_status: EvidenceEditorialStatus | null;
    to_status: EvidenceEditorialStatus | null;
    note: string | null;
    changed_by: string | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    evidenceId: row.evidence_id,
    universeId: row.universe_id,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    changedBy: row.changed_by,
    createdAt: row.created_at,
  }));
}
