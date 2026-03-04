import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { ProvasFilters } from '@/lib/filters/provasFilters';

export type ProvasItem = {
  id: string;
  kind: 'evidence' | 'chunk';
  title: string;
  snippet: string;
  tags: string[];
  year: number | null;
  pages: { start: number | null; end: number | null };
  document: { id: string; title: string; year: number | null } | null;
  nodeIds: string[];
  nodeSlugs: string[];
  curated: boolean;
};

export type ProvasDetail = ProvasItem & {
  sourceUrl: string | null;
  related: ProvasItem[];
};

type ListResult = {
  items: ProvasItem[];
  nextCursor: number | null;
  total: number;
};

function clip(text: string, max = 280) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

async function getNodeScope(universeId: string, nodeSlug: string) {
  const db = getSupabaseServerClient();
  if (!db || !nodeSlug) return null;
  const { data: node } = await db
    .from('nodes')
    .select('id, slug, tags')
    .eq('universe_id', universeId)
    .eq('slug', nodeSlug)
    .maybeSingle();
  if (!node) return null;
  return node;
}

export async function listEvidenceItems(input: {
  universeId: string;
  filters: ProvasFilters;
  limit: number;
  cursor?: number;
}): Promise<ListResult> {
  const db = getSupabaseServerClient();
  if (!db) return { items: [], nextCursor: null, total: 0 };

  const offset = input.cursor ?? 0;
  const limit = Math.max(1, Math.min(50, input.limit));
  const nodeScope = await getNodeScope(input.universeId, input.filters.node);

  let evidenceIdsFromNode: string[] | null = null;
  if (nodeScope) {
    const { data: nodeLinks } = await db
      .from('node_evidences')
      .select('evidence_id')
      .eq('universe_id', input.universeId)
      .eq('node_id', nodeScope.id)
      .limit(300);
    evidenceIdsFromNode = Array.from(new Set((nodeLinks ?? []).map((row) => row.evidence_id).filter(Boolean)));
  }

  let query = db
    .from('evidences')
    .select('id, title, summary, document_id, chunk_id, node_id, source_url, created_at, curated')
    .eq('universe_id', input.universeId)
    .eq('curated', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit + 80);

  if (input.filters.q) query = query.or(`title.ilike.%${input.filters.q}%,summary.ilike.%${input.filters.q}%`);
  if (nodeScope) {
    if (evidenceIdsFromNode && evidenceIdsFromNode.length > 0) {
      query = query.in('id', evidenceIdsFromNode);
    } else {
      query = query.eq('node_id', nodeScope.id);
    }
  }
  if (input.filters.relatedTo) {
    query = query.or(`document_id.eq.${input.filters.relatedTo},id.eq.${input.filters.relatedTo}`);
  }

  const { data: evidenceRows } = await query;
  const evidences = evidenceRows ?? [];

  const docIds = Array.from(new Set(evidences.map((ev) => ev.document_id).filter(Boolean)));
  const chunkIds = Array.from(new Set(evidences.map((ev) => ev.chunk_id).filter(Boolean)));
  const nodeIds = Array.from(new Set(evidences.map((ev) => ev.node_id).filter(Boolean)));

  const [{ data: docsRaw }, { data: chunksRaw }, { data: nodesRaw }] = await Promise.all([
    docIds.length > 0
      ? db.from('documents').select('id, title, year, is_deleted').in('id', docIds).eq('is_deleted', false)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; year: number | null; is_deleted: boolean }> }),
    chunkIds.length > 0
      ? db.from('chunks').select('id, page_start, page_end, text').in('id', chunkIds)
      : Promise.resolve({ data: [] as Array<{ id: string; page_start: number | null; page_end: number | null; text: string }> }),
    nodeIds.length > 0
      ? db.from('nodes').select('id, slug, tags').in('id', nodeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string; tags: string[] }> }),
  ]);

  const docById = new Map((docsRaw ?? []).map((doc) => [doc.id, doc]));
  const chunkById = new Map((chunksRaw ?? []).map((chunk) => [chunk.id, chunk]));
  const nodeById = new Map((nodesRaw ?? []).map((node) => [node.id, node]));

  const mapped = evidences
    .map((evidence) => {
      const doc = evidence.document_id ? docById.get(evidence.document_id) : null;
      const chunk = evidence.chunk_id ? chunkById.get(evidence.chunk_id) : null;
      const node = evidence.node_id ? nodeById.get(evidence.node_id) : null;
      const tags = Array.from(
        new Set([
          ...(node?.tags ?? []),
          evidence.curated ? 'curada' : '',
          doc?.year ? String(doc.year) : '',
        ].filter(Boolean)),
      );
      return {
        id: evidence.id,
        kind: 'evidence' as const,
        title: evidence.title || `Evidencia ${doc?.title ?? ''}`.trim(),
        snippet: clip(evidence.summary || chunk?.text || ''),
        tags,
        year: doc?.year ?? null,
        pages: {
          start: chunk?.page_start ?? null,
          end: chunk?.page_end ?? null,
        },
        document: doc ? { id: doc.id, title: doc.title, year: doc.year } : null,
        nodeIds: evidence.node_id ? [evidence.node_id] : [],
        nodeSlugs: node?.slug ? [node.slug] : [],
        curated: true,
      } satisfies ProvasItem;
    })
    .filter((item) => {
      if (typeof input.filters.yearFrom === 'number' && typeof item.year === 'number' && item.year < input.filters.yearFrom) return false;
      if (typeof input.filters.yearTo === 'number' && typeof item.year === 'number' && item.year > input.filters.yearTo) return false;
      if (input.filters.tags.length > 0) {
        const lowered = item.tags.map((tag) => tag.toLowerCase());
        return input.filters.tags.some((tag) => lowered.includes(tag));
      }
      return true;
    });

  const items = mapped.slice(0, limit);
  const nextCursor = mapped.length > limit ? offset + limit : null;
  return {
    items,
    nextCursor,
    total: mapped.length,
  };
}

export async function listChunkItems(input: {
  universeId: string;
  filters: ProvasFilters;
  limit: number;
  cursor?: number;
}): Promise<ListResult> {
  const db = getSupabaseServerClient();
  if (!db) return { items: [], nextCursor: null, total: 0 };
  const limit = Math.max(1, Math.min(50, input.limit));
  const offset = input.cursor ?? 0;
  const nodeScope = await getNodeScope(input.universeId, input.filters.node);

  let query = db
    .from('chunks')
    .select('id, document_id, page_start, page_end, text, created_at')
    .eq('universe_id', input.universeId)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit + 80);
  if (input.filters.q) query = query.ilike('text', `%${input.filters.q}%`);
  if (input.filters.relatedTo) query = query.eq('document_id', input.filters.relatedTo);
  const { data: chunkRows } = await query;
  const chunks = chunkRows ?? [];

  const docIds = Array.from(new Set(chunks.map((chunk) => chunk.document_id).filter(Boolean)));
  const { data: docsRaw } =
    docIds.length > 0
      ? await db.from('documents').select('id, title, year, is_deleted').in('id', docIds).eq('is_deleted', false)
      : { data: [] as Array<{ id: string; title: string; year: number | null; is_deleted: boolean }> };
  const docById = new Map((docsRaw ?? []).map((doc) => [doc.id, doc]));

  const nodeDocIds =
    nodeScope
      ? (
          await db
            .from('node_documents')
            .select('document_id')
            .eq('universe_id', input.universeId)
            .eq('node_id', nodeScope.id)
            .limit(300)
        ).data ?? []
      : [];
  const scopedDocSet = new Set(nodeDocIds.map((row) => row.document_id));

  const mapped = chunks
    .map((chunk) => {
      const doc = docById.get(chunk.document_id);
      return {
        id: chunk.id,
        kind: 'chunk' as const,
        title: `Trecho ${doc?.title ?? 'Documento'}`,
        snippet: clip(chunk.text),
        tags: ['bruto', doc?.year ? String(doc.year) : ''].filter(Boolean),
        year: doc?.year ?? null,
        pages: { start: chunk.page_start, end: chunk.page_end },
        document: doc ? { id: doc.id, title: doc.title, year: doc.year } : null,
        nodeIds: [],
        nodeSlugs: [],
        curated: false,
      } satisfies ProvasItem;
    })
    .filter((item) => {
      if (nodeScope && item.document && scopedDocSet.size > 0 && !scopedDocSet.has(item.document.id)) return false;
      if (typeof input.filters.yearFrom === 'number' && typeof item.year === 'number' && item.year < input.filters.yearFrom) return false;
      if (typeof input.filters.yearTo === 'number' && typeof item.year === 'number' && item.year > input.filters.yearTo) return false;
      return true;
    });

  const items = mapped.slice(0, limit);
  const nextCursor = mapped.length > limit ? offset + limit : null;
  return {
    items,
    nextCursor,
    total: mapped.length,
  };
}

export async function getRelatedEvidence(input: {
  evidenceId: string;
  universeId: string;
  nodeIds?: string[];
  documentId?: string | null;
}): Promise<ProvasItem[]> {
  const db = getSupabaseServerClient();
  if (!db) return [];
  const nodeIds = input.nodeIds ?? [];
  const byNode =
    nodeIds.length > 0
      ? await db.from('evidences').select('id').eq('universe_id', input.universeId).in('node_id', nodeIds).limit(12)
      : { data: [] as Array<{ id: string }> };
  const byDoc =
    input.documentId
      ? await db
          .from('evidences')
          .select('id')
          .eq('universe_id', input.universeId)
          .eq('document_id', input.documentId)
          .limit(12)
      : { data: [] as Array<{ id: string }> };
  const fallback = await db
    .from('evidences')
    .select('id')
    .eq('universe_id', input.universeId)
    .order('created_at', { ascending: false })
    .limit(12);
  const ids = Array.from(
    new Set([
      ...(byNode.data ?? []).map((item) => item.id),
      ...(byDoc.data ?? []).map((item) => item.id),
      ...(fallback.data ?? []).map((item) => item.id),
    ]),
  )
    .filter((id) => id !== input.evidenceId)
    .slice(0, 6);
  if (ids.length === 0) return [];
  const list = await listEvidenceItems({
    universeId: input.universeId,
    filters: {
      type: 'evidence',
      yearFrom: null,
      yearTo: null,
      tags: [],
      node: '',
      q: '',
      relatedTo: '',
      selected: '',
      panel: '',
      cursor: 0,
    },
    limit: 40,
    cursor: 0,
  });
  return list.items.filter((item) => ids.includes(item.id)).slice(0, 6);
}

export async function getEvidenceDetail(evidenceId: string): Promise<ProvasDetail | null> {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data: evidence } = await db
    .from('evidences')
    .select('id, universe_id, title, summary, source_url, document_id, chunk_id, node_id, curated')
    .eq('id', evidenceId)
    .maybeSingle();
  if (!evidence) return null;

  const [{ data: doc }, { data: chunk }, { data: linkedNodesRaw }] = await Promise.all([
    evidence.document_id
      ? db.from('documents').select('id, title, year, is_deleted').eq('id', evidence.document_id).eq('is_deleted', false).maybeSingle()
      : Promise.resolve({ data: null }),
    evidence.chunk_id ? db.from('chunks').select('id, page_start, page_end, text').eq('id', evidence.chunk_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('node_evidences').select('node_id').eq('evidence_id', evidence.id),
  ]);

  const linkedNodeIds = Array.from(new Set((linkedNodesRaw ?? []).map((row) => row.node_id).filter(Boolean)));
  const allNodeIds = Array.from(new Set([...(evidence.node_id ? [evidence.node_id] : []), ...linkedNodeIds]));
  const { data: nodesRaw } =
    allNodeIds.length > 0
      ? await db.from('nodes').select('id, slug, tags').in('id', allNodeIds)
      : { data: [] as Array<{ id: string; slug: string; tags: string[] }> };

  const tags = Array.from(
    new Set((nodesRaw ?? []).flatMap((node) => node.tags ?? []).filter(Boolean)),
  );
  const nodeSlugs = (nodesRaw ?? []).map((node) => node.slug);
  const detailBase: ProvasItem = {
    id: evidence.id,
    kind: 'evidence',
    title: evidence.title,
    snippet: clip(evidence.summary || chunk?.text || ''),
    tags,
    year: doc?.year ?? null,
    pages: {
      start: chunk?.page_start ?? null,
      end: chunk?.page_end ?? null,
    },
    document: doc ? { id: doc.id, title: doc.title, year: doc.year } : null,
    nodeIds: allNodeIds,
    nodeSlugs,
    curated: evidence.curated,
  };

  const related = await getRelatedEvidence({
    evidenceId: evidence.id,
    universeId: evidence.universe_id,
    nodeIds: allNodeIds,
    documentId: evidence.document_id,
  });

  return {
    ...detailBase,
    sourceUrl: evidence.source_url ?? null,
    related,
  };
}

export async function getChunkDetail(chunkId: string): Promise<ProvasDetail | null> {
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data: chunk } = await db
    .from('chunks')
    .select('id, universe_id, document_id, page_start, page_end, text, archived')
    .eq('id', chunkId)
    .eq('archived', false)
    .maybeSingle();
  if (!chunk) return null;

  const [{ data: doc }, { data: linksRaw }] = await Promise.all([
    db.from('documents').select('id, title, year, source_url, is_deleted').eq('id', chunk.document_id).eq('is_deleted', false).maybeSingle(),
    db
      .from('node_documents')
      .select('node_id')
      .eq('universe_id', chunk.universe_id)
      .eq('document_id', chunk.document_id)
      .limit(40),
  ]);

  const nodeIds = Array.from(new Set((linksRaw ?? []).map((row) => row.node_id).filter(Boolean)));
  const { data: nodesRaw } =
    nodeIds.length > 0
      ? await db.from('nodes').select('id, slug, tags').in('id', nodeIds)
      : { data: [] as Array<{ id: string; slug: string; tags: string[] }> };
  const nodeSlugs = (nodesRaw ?? []).map((node) => node.slug);
  const tags = Array.from(new Set((nodesRaw ?? []).flatMap((node) => node.tags ?? []).filter(Boolean)));

  const relatedChunksRaw = await db
    .from('chunks')
    .select('id, document_id, page_start, page_end, text, created_at')
    .eq('universe_id', chunk.universe_id)
    .eq('document_id', chunk.document_id)
    .eq('archived', false)
    .neq('id', chunk.id)
    .order('created_at', { ascending: false })
    .limit(6);
  const related = (relatedChunksRaw.data ?? []).map(
    (row) =>
      ({
        id: row.id,
        kind: 'chunk',
        title: `Trecho ${doc?.title ?? 'Documento'}`,
        snippet: clip(row.text),
        tags,
        year: doc?.year ?? null,
        pages: { start: row.page_start, end: row.page_end },
        document: doc ? { id: doc.id, title: doc.title, year: doc.year } : null,
        nodeIds,
        nodeSlugs,
        curated: false,
      }) satisfies ProvasItem,
  );

  return {
    id: chunk.id,
    kind: 'chunk',
    title: `Trecho ${doc?.title ?? 'Documento'}`,
    snippet: clip(chunk.text),
    tags,
    year: doc?.year ?? null,
    pages: { start: chunk.page_start, end: chunk.page_end },
    document: doc ? { id: doc.id, title: doc.title, year: doc.year } : null,
    nodeIds,
    nodeSlugs,
    curated: false,
    sourceUrl: doc?.source_url ?? null,
    related,
  };
}
