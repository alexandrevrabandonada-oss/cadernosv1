import 'server-only';
import { requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { addNodeEvidence } from '@/lib/data/nodeLinks';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

function clip(value: string, max: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

export async function promoteChunkToEvidence(input: {
  universeId: string;
  chunkId: string;
  nodeId?: string | null;
  title?: string | null;
  pinRank?: number;
}) {
  const session = await requireEditorOrAdmin();
  const service = getSupabaseServiceRoleClient();
  if (!service) return null;

  const { data: chunk } = await service
    .from('chunks')
    .select('id, universe_id, document_id, page_start, page_end, text')
    .eq('id', input.chunkId)
    .eq('universe_id', input.universeId)
    .maybeSingle();
  if (!chunk) return null;

  const [{ data: doc }, { data: node }] = await Promise.all([
    service
      .from('documents')
      .select('id, title, source_url')
      .eq('id', chunk.document_id)
      .maybeSingle(),
    input.nodeId
      ? service.from('nodes').select('id, title').eq('id', input.nodeId).eq('universe_id', input.universeId).maybeSingle()
      : Promise.resolve({ data: null as { id: string; title: string } | null }),
  ]);

  const fallbackTitle = `${node?.title ?? 'No'} — Evidencia ${chunk.page_start ? `(p.${chunk.page_start})` : ''}`.trim();
  const title = clip(input.title?.trim() || fallbackTitle, 120);
  const summary = clip(chunk.text, 480);

  const { data: existing } = await service
    .from('evidences')
    .select('id')
    .eq('universe_id', input.universeId)
    .eq('chunk_id', chunk.id)
    .maybeSingle();

  const payload = {
    universe_id: input.universeId,
    node_id: input.nodeId ?? null,
    document_id: chunk.document_id,
    chunk_id: chunk.id,
    title,
    summary,
    source_url: doc?.source_url ?? null,
    confidence: 0.7,
    curated: true,
    status: 'draft',
    published_at: null,
    reviewed_by: session.userId,
  };

  let evidenceId: string | null = null;
  if (existing?.id) {
    const { data: previous } = await service.from('evidences').select('status').eq('id', existing.id).maybeSingle();
    await service.from('evidences').update(payload).eq('id', existing.id);
    evidenceId = existing.id;
    await service.from('evidence_audit_logs').insert({
      evidence_id: evidenceId,
      universe_id: input.universeId,
      action: 'status_change',
      from_status: previous?.status ?? null,
      to_status: 'draft',
      note: 'Promovida/atualizada via curadoria assistida',
      changed_by: session.userId,
    });
  } else {
    const { data: inserted } = await service.from('evidences').insert(payload).select('id').maybeSingle();
    evidenceId = inserted?.id ?? null;
    if (evidenceId) {
      await service.from('evidence_audit_logs').insert({
        evidence_id: evidenceId,
        universe_id: input.universeId,
        action: 'create',
        from_status: null,
        to_status: 'draft',
        note: 'Promovida via curadoria assistida',
        changed_by: session.userId,
      });
    }
  }

  if (evidenceId && input.nodeId) {
    await addNodeEvidence({
      universeId: input.universeId,
      nodeId: input.nodeId,
      evidenceId,
      pinRank: input.pinRank ?? 100,
    });
  }

  await service.from('ingest_logs').insert({
    universe_id: input.universeId,
    document_id: chunk.document_id,
    level: 'info',
    message: 'assistive_evidence_promoted',
    details: {
      chunkId: chunk.id,
      evidenceId,
      nodeId: input.nodeId ?? null,
      by: session.userId,
    },
  });

  return {
    evidenceId,
    chunkId: chunk.id,
    documentId: chunk.document_id,
  };
}
