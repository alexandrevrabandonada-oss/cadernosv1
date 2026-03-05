import 'server-only';
import { canWriteAdminContent, requireEditorOrAdmin } from '@/lib/auth/requireRole';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type NodeLinkedDocument = {
  id: string;
  universeId: string;
  nodeId: string;
  documentId: string;
  weight: number;
  note: string | null;
  createdAt: string;
  document: {
    id: string;
    title: string;
    year: number | null;
    status: 'uploaded' | 'processed' | 'link_only' | 'error';
    sourceUrl: string | null;
  } | null;
};

export type NodeLinkedEvidence = {
  id: string;
  universeId: string;
  nodeId: string;
  evidenceId: string;
  pinRank: number;
  createdAt: string;
  evidence: {
    id: string;
    title: string;
    summary: string;
    quote: string;
    documentId: string | null;
    documentTitle: string | null;
    year: number | null;
    pageStart: number | null;
    pageEnd: number | null;
  } | null;
};

export type NodeQuestion = {
  id: string;
  universeId: string;
  nodeId: string;
  question: string;
  pinRank: number;
  createdAt: string;
};

type NodeDocRow = {
  id: string;
  universe_id: string;
  node_id: string;
  document_id: string;
  weight: number;
  note: string | null;
  created_at: string;
};

type NodeEvidenceRow = {
  id: string;
  universe_id: string;
  node_id: string;
  evidence_id: string;
  pin_rank: number;
  created_at: string;
};

type NodeQuestionRow = {
  id: string;
  universe_id: string;
  node_id: string;
  question: string;
  pin_rank: number;
  created_at: string;
};

function asRecord<T>(rows: T[], key: (row: T) => string) {
  const out: Record<string, T[]> = {};
  for (const row of rows) {
    const group = key(row);
    if (!out[group]) out[group] = [];
    out[group].push(row);
  }
  return out;
}

async function getReadClient() {
  if (await canWriteAdminContent()) {
    const service = getSupabaseServiceRoleClient();
    if (service) return service;
  }
  return getSupabaseServerClient();
}

async function fetchNodeDocumentsRows(universeId: string, nodeIds: string[]) {
  if (nodeIds.length === 0) return [] as NodeDocRow[];
  const db = await getReadClient();
  if (!db) return [] as NodeDocRow[];

  const { data } = await db
    .from('node_documents')
    .select('id, universe_id, node_id, document_id, weight, note, created_at')
    .eq('universe_id', universeId)
    .in('node_id', nodeIds)
    .order('weight', { ascending: false });

  return (data ?? []) as NodeDocRow[];
}

async function fetchNodeEvidencesRows(universeId: string, nodeIds: string[]) {
  if (nodeIds.length === 0) return [] as NodeEvidenceRow[];
  const db = await getReadClient();
  if (!db) return [] as NodeEvidenceRow[];

  const { data } = await db
    .from('node_evidences')
    .select('id, universe_id, node_id, evidence_id, pin_rank, created_at')
    .eq('universe_id', universeId)
    .in('node_id', nodeIds)
    .order('pin_rank', { ascending: true });

  return (data ?? []) as NodeEvidenceRow[];
}

export async function listNodeDocuments(nodeId: string) {
  const db = await getReadClient();
  if (!db) return [] as NodeLinkedDocument[];

  const { data: node } = await db.from('nodes').select('id, universe_id').eq('id', nodeId).maybeSingle();
  if (!node) return [] as NodeLinkedDocument[];

  const rows = await fetchNodeDocumentsRows(node.universe_id, [nodeId]);
  if (rows.length === 0) return [] as NodeLinkedDocument[];

  const docIds = Array.from(new Set(rows.map((row) => row.document_id)));
  const { data: docsRaw } = await db
    .from('documents')
    .select('id, title, year, status, source_url, is_deleted')
    .in('id', docIds)
    .eq('is_deleted', false);

  const docs = new Map(
    (docsRaw ?? []).map((doc) => [
      doc.id,
      {
        id: doc.id,
        title: doc.title,
        year: doc.year,
        status: doc.status as 'uploaded' | 'processed' | 'link_only' | 'error',
        sourceUrl: doc.source_url,
      },
    ]),
  );

  return rows.map((row) => ({
    id: row.id,
    universeId: row.universe_id,
    nodeId: row.node_id,
    documentId: row.document_id,
    weight: row.weight,
    note: row.note,
    createdAt: row.created_at,
    document: docs.get(row.document_id) ?? null,
  }));
}

export async function listNodeDocumentsByNodeIds(universeId: string, nodeIds: string[]) {
  const rows = await fetchNodeDocumentsRows(universeId, nodeIds);
  const db = await getReadClient();
  if (!db) return {} as Record<string, NodeLinkedDocument[]>;
  if (rows.length === 0) return {} as Record<string, NodeLinkedDocument[]>;

  const docIds = Array.from(new Set(rows.map((row) => row.document_id)));
  const { data: docsRaw } = await db
    .from('documents')
    .select('id, title, year, status, source_url, is_deleted')
    .in('id', docIds)
    .eq('is_deleted', false);

  const docs = new Map(
    (docsRaw ?? []).map((doc) => [
      doc.id,
      {
        id: doc.id,
        title: doc.title,
        year: doc.year,
        status: doc.status as 'uploaded' | 'processed' | 'link_only' | 'error',
        sourceUrl: doc.source_url,
      },
    ]),
  );

  const mapped = rows.map((row) => ({
    id: row.id,
    universeId: row.universe_id,
    nodeId: row.node_id,
    documentId: row.document_id,
    weight: row.weight,
    note: row.note,
    createdAt: row.created_at,
    document: docs.get(row.document_id) ?? null,
  }));

  return asRecord(mapped, (item) => item.nodeId);
}

export async function listNodeEvidences(nodeId: string) {
  const db = await getReadClient();
  if (!db) return [] as NodeLinkedEvidence[];

  const { data: node } = await db.from('nodes').select('id, universe_id').eq('id', nodeId).maybeSingle();
  if (!node) return [] as NodeLinkedEvidence[];

  const links = await fetchNodeEvidencesRows(node.universe_id, [nodeId]);
  if (links.length === 0) return [] as NodeLinkedEvidence[];

  const evidenceIds = Array.from(new Set(links.map((link) => link.evidence_id)));
  const { data: evidencesRaw } = await db
    .from('evidences')
    .select('id, title, summary, document_id, chunk_id')
    .in('id', evidenceIds);

  const chunkIds = Array.from(new Set((evidencesRaw ?? []).map((item) => item.chunk_id).filter(Boolean)));
  const docIds = Array.from(new Set((evidencesRaw ?? []).map((item) => item.document_id).filter(Boolean)));

  const [{ data: chunksRaw }, { data: docsRaw }] = await Promise.all([
    chunkIds.length > 0
      ? db.from('chunks').select('id, page_start, page_end').in('id', chunkIds)
      : Promise.resolve({ data: [] as Array<{ id: string; page_start: number | null; page_end: number | null }> }),
    docIds.length > 0
      ? db.from('documents').select('id, title, year').in('id', docIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; year: number | null }> }),
  ]);

  const chunkById = new Map((chunksRaw ?? []).map((chunk) => [chunk.id, chunk]));
  const docById = new Map((docsRaw ?? []).map((doc) => [doc.id, doc]));
  const evidenceById = new Map((evidencesRaw ?? []).map((evidence) => [evidence.id, evidence]));

  return links.map((link) => {
    const evidence = evidenceById.get(link.evidence_id);
    const doc = evidence?.document_id ? docById.get(evidence.document_id) : null;
    const chunk = evidence?.chunk_id ? chunkById.get(evidence.chunk_id) : null;
    return {
      id: link.id,
      universeId: link.universe_id,
      nodeId: link.node_id,
      evidenceId: link.evidence_id,
      pinRank: link.pin_rank,
      createdAt: link.created_at,
      evidence: evidence
        ? {
            id: evidence.id,
            title: evidence.title,
            summary: evidence.summary,
            quote: evidence.summary,
            documentId: evidence.document_id,
            documentTitle: doc?.title ?? null,
            year: doc?.year ?? null,
            pageStart: chunk?.page_start ?? null,
            pageEnd: chunk?.page_end ?? null,
          }
        : null,
    } satisfies NodeLinkedEvidence;
  });
}

export async function listNodeEvidencesByNodeIds(universeId: string, nodeIds: string[]) {
  const links = await fetchNodeEvidencesRows(universeId, nodeIds);
  if (links.length === 0) return {} as Record<string, NodeLinkedEvidence[]>;

  const db = await getReadClient();
  if (!db) return {} as Record<string, NodeLinkedEvidence[]>;

  const evidenceIds = Array.from(new Set(links.map((link) => link.evidence_id)));
  const { data: evidencesRaw } = await db
    .from('evidences')
    .select('id, title, summary, document_id, chunk_id')
    .in('id', evidenceIds);

  const chunkIds = Array.from(new Set((evidencesRaw ?? []).map((item) => item.chunk_id).filter(Boolean)));
  const docIds = Array.from(new Set((evidencesRaw ?? []).map((item) => item.document_id).filter(Boolean)));

  const [{ data: chunksRaw }, { data: docsRaw }] = await Promise.all([
    chunkIds.length > 0
      ? db.from('chunks').select('id, page_start, page_end').in('id', chunkIds)
      : Promise.resolve({ data: [] as Array<{ id: string; page_start: number | null; page_end: number | null }> }),
    docIds.length > 0
      ? db.from('documents').select('id, title, year').in('id', docIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; year: number | null }> }),
  ]);

  const chunkById = new Map((chunksRaw ?? []).map((chunk) => [chunk.id, chunk]));
  const docById = new Map((docsRaw ?? []).map((doc) => [doc.id, doc]));
  const evidenceById = new Map((evidencesRaw ?? []).map((evidence) => [evidence.id, evidence]));

  const mapped = links.map((link) => {
    const evidence = evidenceById.get(link.evidence_id);
    const doc = evidence?.document_id ? docById.get(evidence.document_id) : null;
    const chunk = evidence?.chunk_id ? chunkById.get(evidence.chunk_id) : null;
    return {
      id: link.id,
      universeId: link.universe_id,
      nodeId: link.node_id,
      evidenceId: link.evidence_id,
      pinRank: link.pin_rank,
      createdAt: link.created_at,
      evidence: evidence
        ? {
            id: evidence.id,
            title: evidence.title,
            summary: evidence.summary,
            quote: evidence.summary,
            documentId: evidence.document_id,
            documentTitle: doc?.title ?? null,
            year: doc?.year ?? null,
            pageStart: chunk?.page_start ?? null,
            pageEnd: chunk?.page_end ?? null,
          }
        : null,
    } satisfies NodeLinkedEvidence;
  });

  return asRecord(mapped, (item) => item.nodeId);
}

export async function listNodeQuestions(nodeId: string) {
  const db = await getReadClient();
  if (!db) return [] as NodeQuestion[];

  const { data } = await db
    .from('node_questions')
    .select('id, universe_id, node_id, question, pin_rank, created_at')
    .eq('node_id', nodeId)
    .order('pin_rank', { ascending: true });

  return ((data ?? []) as NodeQuestionRow[]).map((item) => ({
    id: item.id,
    universeId: item.universe_id,
    nodeId: item.node_id,
    question: item.question,
    pinRank: item.pin_rank,
    createdAt: item.created_at,
  }));
}

export async function listNodeQuestionsByNodeIds(universeId: string, nodeIds: string[]) {
  if (nodeIds.length === 0) return {} as Record<string, NodeQuestion[]>;
  const db = await getReadClient();
  if (!db) return {} as Record<string, NodeQuestion[]>;

  const { data } = await db
    .from('node_questions')
    .select('id, universe_id, node_id, question, pin_rank, created_at')
    .eq('universe_id', universeId)
    .in('node_id', nodeIds)
    .order('pin_rank', { ascending: true });

  const mapped = ((data ?? []) as NodeQuestionRow[]).map((item) => ({
    id: item.id,
    universeId: item.universe_id,
    nodeId: item.node_id,
    question: item.question,
    pinRank: item.pin_rank,
    createdAt: item.created_at,
  }));

  return asRecord(mapped, (item) => item.nodeId);
}

export async function listNodeLinkCounts(universeId: string, nodeIds: string[]) {
  if (nodeIds.length === 0) return {} as Record<string, { docs: number; evidences: number }>;
  const [docRows, evidenceRows] = await Promise.all([
    fetchNodeDocumentsRows(universeId, nodeIds),
    fetchNodeEvidencesRows(universeId, nodeIds),
  ]);

  const counts: Record<string, { docs: number; evidences: number }> = {};
  for (const nodeId of nodeIds) {
    counts[nodeId] = { docs: 0, evidences: 0 };
  }
  for (const row of docRows) {
    if (!counts[row.node_id]) counts[row.node_id] = { docs: 0, evidences: 0 };
    counts[row.node_id].docs += 1;
  }
  for (const row of evidenceRows) {
    if (!counts[row.node_id]) counts[row.node_id] = { docs: 0, evidences: 0 };
    counts[row.node_id].evidences += 1;
  }
  return counts;
}

export async function upsertNodeDocument(input: {
  universeId: string;
  nodeId: string;
  documentId: string;
  weight: number;
  note?: string;
}) {
  const session = await requireEditorOrAdmin();
  const service = getSupabaseServiceRoleClient();
  if (!service) return;

  await service.from('node_documents').upsert(
    {
      universe_id: input.universeId,
      node_id: input.nodeId,
      document_id: input.documentId,
      weight: Math.max(0, Math.min(1000, Math.round(input.weight))),
      note: input.note?.trim() ? input.note.trim() : null,
      created_by: session.userId,
    },
    { onConflict: 'node_id,document_id' },
  );
}

export async function removeNodeDocument(nodeId: string, documentId: string) {
  await requireEditorOrAdmin();
  const service = getSupabaseServiceRoleClient();
  if (!service) return;
  await service.from('node_documents').delete().eq('node_id', nodeId).eq('document_id', documentId);
}

export async function addNodeEvidence(input: { universeId: string; nodeId: string; evidenceId: string; pinRank?: number }) {
  const session = await requireEditorOrAdmin();
  const service = getSupabaseServiceRoleClient();
  if (!service) return;

  await service.from('node_evidences').upsert(
    {
      universe_id: input.universeId,
      node_id: input.nodeId,
      evidence_id: input.evidenceId,
      pin_rank: Math.max(0, Math.min(1000, Math.round(input.pinRank ?? 100))),
      created_by: session.userId,
    },
    { onConflict: 'node_id,evidence_id' },
  );
}

export async function removeNodeEvidence(nodeId: string, evidenceId: string) {
  await requireEditorOrAdmin();
  const service = getSupabaseServiceRoleClient();
  if (!service) return;
  await service.from('node_evidences').delete().eq('node_id', nodeId).eq('evidence_id', evidenceId);
}

export async function upsertNodeQuestion(input: {
  universeId: string;
  nodeId: string;
  question: string;
  pinRank?: number;
}) {
  const session = await requireEditorOrAdmin();
  const service = getSupabaseServiceRoleClient();
  if (!service) return;

  const question = input.question.trim();
  if (!question) return;
  await service.from('node_questions').upsert(
    {
      universe_id: input.universeId,
      node_id: input.nodeId,
      question,
      pin_rank: Math.max(0, Math.min(1000, Math.round(input.pinRank ?? 100))),
      created_by: session.userId,
    },
    { onConflict: 'node_id,question' },
  );
}

export async function removeNodeQuestion(id: string) {
  await requireEditorOrAdmin();
  const service = getSupabaseServiceRoleClient();
  if (!service) return;
  await service.from('node_questions').delete().eq('id', id);
}
