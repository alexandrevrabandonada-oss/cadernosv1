import 'server-only';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { DebateFilters } from '@/lib/filters/debateFilters';
import { getUniverseMock } from '@/lib/mock/universe';

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

export type DebateThreadItem = {
  id: string;
  question: string;
  answerPreview: string;
  createdAt: string;
  mode: 'strict_ok' | 'insufficient';
  source: 'default' | 'guided' | 'tutor_chat';
  node: { id: string; slug: string; title: string } | null;
  docsUsed: number | null;
  chunksUsed: number | null;
  citationsCount: number;
};

export type DebateThreadDetail = {
  thread: DebateThreadItem & {
    answer: string;
    insufficientReason: string | null;
  };
  citations: Array<
    DocThreadCitation & {
      ord: number | null;
    }
  >;
  dominantDocumentId: string | null;
  related: DebateThreadItem[];
};

export type DebateThreadListResult = {
  items: DebateThreadItem[];
  nextCursor: number | null;
  universeId: string;
  universeTitle: string;
  nodes: Array<{ id: string; slug: string; title: string; kind: string | null }>;
};

function clip(text: string, max = 180) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function normalizeSource(value: string | null | undefined): 'default' | 'guided' | 'tutor_chat' {
  if (value === 'guided' || value === 'tutor_chat') return value;
  return 'default';
}

function normalizeMode(value: string | null | undefined): 'strict_ok' | 'insufficient' {
  return value === 'insufficient' ? 'insufficient' : 'strict_ok';
}

function parseYear(dateIso: string) {
  const year = Number(dateIso.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function isTestSeedEnabled() {
  return process.env.TEST_SEED === '1';
}

function mockThreadList(slug: string): DebateThreadItem[] {
  const mock = getUniverseMock(slug);
  return mock.coreNodes.slice(0, 8).map((node, index) => {
    const createdAt = new Date(Date.now() - index * 86_400_000).toISOString();
    return {
      id: `${slug}-thread-${index + 1}`,
      question: `O que as evidencias mostram sobre ${node.label}?`,
      answerPreview: `Achados: ha sinais associados ao no ${node.label}. Limitacoes: base ainda parcial para este eixo.`,
      createdAt,
      mode: index % 3 === 0 ? 'insufficient' : 'strict_ok',
      source: index % 2 === 0 ? 'default' : 'guided',
      node: { id: node.id, slug: node.slug ?? node.id, title: node.label },
      docsUsed: 1 + (index % 3),
      chunksUsed: 2 + (index % 4),
      citationsCount: 2,
    } satisfies DebateThreadItem;
  });
}

function mockThreadDetail(slug: string, threadId: string): DebateThreadDetail | null {
  const threads = mockThreadList(slug);
  const thread = threads.find((item) => item.id === threadId);
  if (!thread) return null;
  const docId = `${slug}-doc-1`;
  return {
    thread: {
      ...thread,
      answer:
        '## Achados\n- Evidencia 1 aponta concentracao local acima do esperado.\n- Evidencia 2 reforca recorrencia temporal.\n## Limitacoes\n- Base de documentos ainda pequena.\n- Falta triangulacao em mais bairros.',
      insufficientReason: thread.mode === 'insufficient' ? 'Amostra insuficiente em documentos do periodo.' : null,
    },
    citations: [
      {
        citationId: `${thread.id}-cite-1`,
        threadId: thread.id,
        chunkId: `${thread.id}-chunk-1`,
        docId,
        docTitle: 'Documento Demo',
        year: 2024,
        pageStart: 12,
        pageEnd: 13,
        quote: 'Trecho sintetico de suporte a hipotese principal.',
        quoteStart: 8,
        quoteEnd: 58,
        highlightToken: `${thread.id}-hl-1`,
        chunkText: 'Contexto ... Trecho sintetico de suporte a hipotese principal. ... contexto.',
        ord: 1,
      },
      {
        citationId: `${thread.id}-cite-2`,
        threadId: thread.id,
        chunkId: `${thread.id}-chunk-2`,
        docId,
        docTitle: 'Documento Demo',
        year: 2023,
        pageStart: 44,
        pageEnd: 44,
        quote: 'Outro trecho relevante para contraste metodologico.',
        quoteStart: 0,
        quoteEnd: 49,
        highlightToken: `${thread.id}-hl-2`,
        chunkText: 'Outro trecho relevante para contraste metodologico.',
        ord: 2,
      },
    ],
    dominantDocumentId: docId,
    related: threads.filter((item) => item.id !== thread.id).slice(0, 4),
  };
}

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

export async function listThreads(input: {
  slug: string;
  filters: DebateFilters;
  limit: number;
  cursor?: number;
}): Promise<DebateThreadListResult | null> {
  if (isTestSeedEnabled()) {
    const mock = getUniverseMock(input.slug);
    const nodes = mock.coreNodes.map((node) => ({
      id: node.id,
      slug: node.slug ?? node.id,
      title: node.label,
      kind: node.type,
    }));
    const filtered = mockThreadList(input.slug).filter((row) => {
      if (input.filters.q && !`${row.question} ${row.answerPreview}`.toLowerCase().includes(input.filters.q.toLowerCase())) return false;
      if (input.filters.status !== 'all' && row.mode !== input.filters.status) return false;
      if (input.filters.kind !== 'all' && row.source !== input.filters.kind) return false;
      if (input.filters.node && row.node?.slug !== input.filters.node) return false;
      const year = parseYear(row.createdAt);
      if (typeof input.filters.yearFrom === 'number' && typeof year === 'number' && year < input.filters.yearFrom) return false;
      if (typeof input.filters.yearTo === 'number' && typeof year === 'number' && year > input.filters.yearTo) return false;
      return true;
    });
    const cursor = Math.max(0, input.cursor ?? input.filters.cursor ?? 0);
    const limit = Math.max(1, Math.min(40, input.limit));
    const items = filtered.slice(cursor, cursor + limit);
    const nextCursor = filtered.length > cursor + limit ? cursor + limit : null;
    return {
      items,
      nextCursor,
      universeId: `mock-${mock.slug}`,
      universeTitle: mock.title,
      nodes,
    };
  }

  const universe = await getUniverseContextBySlug(input.slug);
  if (!universe) return null;
  const db = getSupabaseServerClient();
  if (!db) return null;

  const cursor = Math.max(0, input.cursor ?? input.filters.cursor ?? 0);
  const limit = Math.max(1, Math.min(40, input.limit));

  const { data: nodesRaw } = await db
    .from('nodes')
    .select('id, slug, title, kind')
    .eq('universe_id', universe.id)
    .order('title', { ascending: true });
  const nodes = (nodesRaw ?? []).map((node) => ({
    id: node.id,
    slug: node.slug,
    title: node.title,
    kind: node.kind ?? null,
  }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeSlugToId = new Map(nodes.map((node) => [node.slug, node.id]));

  let query = db
    .from('qa_threads')
    .select('id, question, answer, created_at, mode, source, node_id, docs_used, chunks_used')
    .eq('universe_id', universe.id)
    .order('created_at', { ascending: false })
    .range(cursor, cursor + limit + 120);

  if (input.filters.q) query = query.or(`question.ilike.%${input.filters.q}%,answer.ilike.%${input.filters.q}%`);
  if (input.filters.status !== 'all') query = query.eq('mode', input.filters.status);
  if (input.filters.kind !== 'all') query = query.eq('source', input.filters.kind);
  if (input.filters.node) {
    const nodeId = nodeSlugToId.get(input.filters.node);
    if (!nodeId) {
      return {
        items: [],
        nextCursor: null,
        universeId: universe.id,
        universeTitle: universe.title,
        nodes,
      };
    }
    query = query.eq('node_id', nodeId);
  }

  const { data: rowsRaw } = await query;
  const rows =
    (rowsRaw as Array<{
      id: string;
      question: string;
      answer: string;
      created_at: string;
      mode: string | null;
      source: string | null;
      node_id: string | null;
      docs_used: number | null;
      chunks_used: number | null;
    }>) ?? [];

  const threadIds = rows.map((row) => row.id);
  const { data: countsRaw } =
    threadIds.length > 0
      ? await db.from('citations').select('qa_thread_id').in('qa_thread_id', threadIds)
      : { data: [] as Array<{ qa_thread_id: string }> };
  const citationCountByThread = new Map<string, number>();
  for (const row of countsRaw ?? []) {
    citationCountByThread.set(row.qa_thread_id, (citationCountByThread.get(row.qa_thread_id) ?? 0) + 1);
  }

  const filtered = rows
    .filter((row) => {
      const year = parseYear(row.created_at);
      if (typeof input.filters.yearFrom === 'number' && typeof year === 'number' && year < input.filters.yearFrom) return false;
      if (typeof input.filters.yearTo === 'number' && typeof year === 'number' && year > input.filters.yearTo) return false;
      return true;
    })
    .map((row) => {
      const node = row.node_id ? nodeById.get(row.node_id) ?? null : null;
      return {
        id: row.id,
        question: row.question,
        answerPreview: clip(row.answer ?? ''),
        createdAt: row.created_at,
        mode: normalizeMode(row.mode),
        source: normalizeSource(row.source),
        node: node ? { id: node.id, slug: node.slug, title: node.title } : null,
        docsUsed: row.docs_used ?? null,
        chunksUsed: row.chunks_used ?? null,
        citationsCount: citationCountByThread.get(row.id) ?? 0,
      } satisfies DebateThreadItem;
    });

  const items = filtered.slice(0, limit);
  const nextCursor = filtered.length > limit ? cursor + limit : null;

  return {
    items,
    nextCursor,
    universeId: universe.id,
    universeTitle: universe.title,
    nodes,
  };
}

export async function getThreadDetail(slug: string, threadId: string): Promise<DebateThreadDetail | null> {
  if (isTestSeedEnabled()) {
    return mockThreadDetail(slug, threadId);
  }

  const universe = await getUniverseContextBySlug(slug);
  if (!universe) return null;
  const db = getSupabaseServerClient();
  if (!db) return null;

  const { data: threadRaw } = await db
    .from('qa_threads')
    .select('id, question, answer, created_at, mode, source, node_id, docs_used, chunks_used, insufficient_reason')
    .eq('universe_id', universe.id)
    .eq('id', threadId)
    .maybeSingle();
  if (!threadRaw) return null;

  const [{ data: nodeRaw }, { data: citationRowsRaw }] = await Promise.all([
    threadRaw.node_id
      ? db.from('nodes').select('id, slug, title').eq('id', threadRaw.node_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from('citations')
      .select('id, qa_thread_id, chunk_id, quote, page_start, page_end, quote_start, quote_end, highlight_token, ord')
      .eq('qa_thread_id', threadId)
      .order('ord', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
  ]);
  const citationRows =
    (citationRowsRaw as Array<{
      id: string;
      qa_thread_id: string;
      chunk_id: string;
      quote: string;
      page_start: number | null;
      page_end: number | null;
      quote_start: number | null;
      quote_end: number | null;
      highlight_token: string | null;
      ord: number | null;
    }>) ?? [];
  const chunkIds = Array.from(new Set(citationRows.map((row) => row.chunk_id).filter(Boolean)));

  const { data: chunksRaw } =
    chunkIds.length > 0
      ? await db.from('chunks').select('id, document_id, text').in('id', chunkIds)
      : { data: [] as Array<{ id: string; document_id: string; text: string }> };
  const chunkById = new Map((chunksRaw ?? []).map((chunk) => [chunk.id, chunk]));

  const docIds = Array.from(new Set((chunksRaw ?? []).map((chunk) => chunk.document_id).filter(Boolean)));
  const { data: docsRaw } =
    docIds.length > 0
      ? await db.from('documents').select('id, title, year, source_url, is_deleted').in('id', docIds).eq('is_deleted', false)
      : { data: [] as Array<{ id: string; title: string; year: number | null; source_url: string | null; is_deleted: boolean }> };
  const docById = new Map((docsRaw ?? []).map((doc) => [doc.id, doc]));

  const citations = citationRows
    .map((row) => {
      const chunk = chunkById.get(row.chunk_id);
      if (!chunk) return null;
      const doc = docById.get(chunk.document_id);
      if (!doc) return null;
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
        ord: row.ord,
      };
    })
    .filter((item): item is DebateThreadDetail['citations'][number] => Boolean(item));

  const docFrequency = new Map<string, number>();
  for (const citation of citations) {
    docFrequency.set(citation.docId, (docFrequency.get(citation.docId) ?? 0) + 1);
  }
  const dominantDocumentId =
    Array.from(docFrequency.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const baseItem: DebateThreadItem = {
    id: threadRaw.id,
    question: threadRaw.question,
    answerPreview: clip(threadRaw.answer),
    createdAt: threadRaw.created_at,
    mode: normalizeMode(threadRaw.mode),
    source: normalizeSource(threadRaw.source),
    node: nodeRaw ? { id: nodeRaw.id, slug: nodeRaw.slug, title: nodeRaw.title } : null,
    docsUsed: threadRaw.docs_used ?? null,
    chunksUsed: threadRaw.chunks_used ?? null,
    citationsCount: citations.length,
  };

  const related = await getThreadRelated(slug, threadRaw.id, {
    nodeId: baseItem.node?.id ?? null,
    docIds: Array.from(new Set(citations.map((citation) => citation.docId))),
  });

  return {
    thread: {
      ...baseItem,
      answer: threadRaw.answer,
      insufficientReason: threadRaw.insufficient_reason ?? null,
    },
    citations,
    dominantDocumentId,
    related,
  };
}

export async function getThreadRelated(
  slug: string,
  threadId: string,
  input: { nodeId?: string | null; docIds?: string[] },
): Promise<DebateThreadItem[]> {
  const universe = await getUniverseContextBySlug(slug);
  if (!universe) return [];
  const db = getSupabaseServerClient();
  if (!db) return [];

  const ids = new Set<string>();

  if (input.nodeId) {
    const { data: byNode } = await db
      .from('qa_threads')
      .select('id')
      .eq('universe_id', universe.id)
      .eq('node_id', input.nodeId)
      .order('created_at', { ascending: false })
      .limit(8);
    for (const row of byNode ?? []) {
      if (row.id !== threadId) ids.add(row.id);
    }
  }

  if ((input.docIds ?? []).length > 0) {
    const { data: citationsRaw } = await db
      .from('citations')
      .select('qa_thread_id, chunk_id')
      .neq('qa_thread_id', threadId)
      .limit(400);
    const chunkIds = Array.from(new Set((citationsRaw ?? []).map((row) => row.chunk_id)));
    const { data: chunksRaw } =
      chunkIds.length > 0
        ? await db.from('chunks').select('id, document_id').in('id', chunkIds).in('document_id', input.docIds ?? [])
        : { data: [] as Array<{ id: string; document_id: string }> };
    const validChunkIds = new Set((chunksRaw ?? []).map((chunk) => chunk.id));
    for (const row of citationsRaw ?? []) {
      if (validChunkIds.has(row.chunk_id)) ids.add(row.qa_thread_id);
    }
  }

  if (ids.size < 6) {
    const { data: fallback } = await db
      .from('qa_threads')
      .select('id')
      .eq('universe_id', universe.id)
      .order('created_at', { ascending: false })
      .limit(12);
    for (const row of fallback ?? []) {
      if (row.id !== threadId) ids.add(row.id);
    }
  }

  const relatedIds = Array.from(ids).slice(0, 6);
  if (relatedIds.length === 0) return [];
  const list = await listThreads({
    slug,
    filters: {
      lens: 'default',
      node: '',
      kind: 'all',
      status: 'all',
      q: '',
      yearFrom: null,
      yearTo: null,
      selected: '',
      panel: '',
      cursor: 0,
    },
    limit: 40,
    cursor: 0,
  });
  if (!list) return [];
  return list.items.filter((item) => relatedIds.includes(item.id)).slice(0, 6);
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
