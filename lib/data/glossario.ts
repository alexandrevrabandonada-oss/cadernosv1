import 'server-only';
import { getUniverseMock } from '@/lib/mock/universe';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { GlossarioFilters } from '@/lib/filters/glossarioFilters';

export type GlossaryListItem = {
  id: string;
  slug: string;
  term: string;
  shortDef: string;
  tags: string[];
  node: { id: string; slug: string; title: string } | null;
};

export type GlossaryDetail = {
  id: string;
  slug: string;
  term: string;
  shortDef: string;
  body: string;
  tags: string[];
  node: { id: string; slug: string; title: string } | null;
  evidences: Array<{
    id: string;
    title: string;
    summary: string;
    documentId: string | null;
    documentTitle: string | null;
    year: number | null;
    pageStart: number | null;
    pageEnd: number | null;
  }>;
  questionPrompts: string[];
  relatedNodes: Array<{ id: string; slug: string; title: string }>;
};

export type GlossaryListResult = {
  source: 'db' | 'mock';
  universeId: string;
  universeTitle: string;
  items: GlossaryListItem[];
  nextCursor: number | null;
  tagOptions: string[];
};

function clip(text: string, max = 140) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function mockGlossary(slug: string, filters: GlossarioFilters, limit: number, cursor: number): GlossaryListResult {
  const mock = getUniverseMock(slug);
  const itemsRaw = mock.coreNodes.map((node) => {
    const term = node.label;
    return {
      id: `mock-${slug}-${node.id}`,
      slug: slugify(term),
      term,
      shortDef: clip(node.summary ?? `Conceito relacionado a ${term}.`),
      tags: (node.tags ?? []).slice(0, 4),
      node: { id: node.id, slug: node.slug ?? node.id, title: node.label },
    } satisfies GlossaryListItem;
  });
  const filtered = itemsRaw.filter((item) => {
    if (filters.letter && item.term.slice(0, 1).toUpperCase() !== filters.letter) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!`${item.term} ${item.shortDef}`.toLowerCase().includes(q)) return false;
    }
    if (filters.tags.length > 0) {
      const tags = item.tags.map((tag) => tag.toLowerCase());
      if (!filters.tags.some((tag) => tags.includes(tag))) return false;
    }
    return true;
  });
  return {
    source: 'mock',
    universeId: mock.slug,
    universeTitle: mock.title,
    items: filtered.slice(cursor, cursor + limit),
    nextCursor: filtered.length > cursor + limit ? cursor + limit : null,
    tagOptions: Array.from(new Set(itemsRaw.flatMap((item) => item.tags))).slice(0, 16),
  };
}

function mockGlossaryDetail(input: { slug: string; termId?: string; termSlug?: string }): GlossaryDetail | null {
  const mock = getUniverseMock(input.slug);
  const mapped = mock.coreNodes.map((node) => ({
    id: `mock-${input.slug}-${node.id}`,
    slug: slugify(node.label),
    term: node.label,
    shortDef: clip(node.summary ?? `Conceito relacionado a ${node.label}.`),
    body: node.summary ?? `Descricao estendida sobre ${node.label}.`,
    tags: (node.tags ?? []).slice(0, 4),
    node: { id: node.id, slug: node.slug ?? node.id, title: node.label },
  }));
  const selected =
    mapped.find((item) => (input.termId ? item.id === input.termId : false)) ??
    mapped.find((item) => (input.termSlug ? item.slug === input.termSlug : false)) ??
    null;
  if (!selected) return null;
  return {
    id: selected.id,
    slug: selected.slug,
    term: selected.term,
    shortDef: selected.shortDef,
    body: selected.body,
    tags: selected.tags,
    node: selected.node,
    evidences: [
      {
        id: `${selected.id}-ev-1`,
        title: `Evidencia ligada a ${selected.term}`,
        summary: `Trecho curado que conecta o termo ${selected.term} ao universo.`,
        documentId: `${input.slug}-doc-1`,
        documentTitle: 'Documento Demo',
        year: 2024,
        pageStart: 12,
        pageEnd: 13,
      },
    ],
    questionPrompts: [
      `O que as evidencias mostram sobre ${selected.term}?`,
      `Quais lacunas aparecem sobre ${selected.term}?`,
    ],
    relatedNodes: [selected.node],
  };
}

export async function listGlossaryTerms(input: {
  slug: string;
  filters: GlossarioFilters;
  limit: number;
  cursor?: number;
}): Promise<GlossaryListResult> {
  const db = getSupabaseServerClient();
  const limit = Math.max(1, Math.min(40, input.limit));
  const cursor = Math.max(0, input.cursor ?? input.filters.cursor ?? 0);
  if (!db) return mockGlossary(input.slug, input.filters, limit, cursor);

  const { data: universe } = await db.from('universes').select('id, title').eq('slug', input.slug).maybeSingle();
  if (!universe) return mockGlossary(input.slug, input.filters, limit, cursor);

  let query = db
    .from('glossary_terms')
    .select('id, slug, term, short_def, tags, node_id')
    .eq('universe_id', universe.id)
    .order('term', { ascending: true })
    .range(cursor, cursor + limit + 120);

  if (input.filters.q) query = query.or(`term.ilike.%${input.filters.q}%,short_def.ilike.%${input.filters.q}%,body.ilike.%${input.filters.q}%`);
  if (input.filters.tags.length > 0) query = query.overlaps('tags', input.filters.tags);
  if (input.filters.letter) query = query.ilike('term', `${input.filters.letter}%`);

  const { data: rowsRaw } = await query;
  const rows =
    (rowsRaw as Array<{
      id: string;
      slug: string;
      term: string;
      short_def: string | null;
      tags: string[] | null;
      node_id: string | null;
    }>) ?? [];
  const nodeIds = Array.from(new Set(rows.map((row) => row.node_id).filter(Boolean))) as string[];
  const { data: nodesRaw } =
    nodeIds.length > 0
      ? await db.from('nodes').select('id, slug, title').in('id', nodeIds)
      : { data: [] as Array<{ id: string; slug: string; title: string }> };
  const nodeById = new Map((nodesRaw ?? []).map((node) => [node.id, node]));
  const mapped = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    term: row.term,
    shortDef: row.short_def ?? '',
    tags: row.tags ?? [],
    node: row.node_id && nodeById.get(row.node_id) ? nodeById.get(row.node_id)! : null,
  }));

  const { data: tagRowsRaw } = await db.from('glossary_terms').select('tags').eq('universe_id', universe.id).limit(300);
  const tagOptions = Array.from(new Set((tagRowsRaw ?? []).flatMap((item) => item.tags ?? []).filter(Boolean))).slice(0, 24);

  return {
    source: 'db',
    universeId: universe.id,
    universeTitle: universe.title,
    items: mapped.slice(0, limit),
    nextCursor: mapped.length > limit ? cursor + limit : null,
    tagOptions,
  };
}

export async function getGlossaryDetail(input: { slug: string; termId?: string; termSlug?: string }): Promise<GlossaryDetail | null> {
  const db = getSupabaseServerClient();
  if (!db) return mockGlossaryDetail(input);
  const { data: universe } = await db.from('universes').select('id').eq('slug', input.slug).maybeSingle();
  if (!universe) return mockGlossaryDetail(input);

  let query = db
    .from('glossary_terms')
    .select('id, slug, term, short_def, body, tags, node_id, evidence_ids, question_prompts')
    .eq('universe_id', universe.id);
  if (input.termId) query = query.eq('id', input.termId);
  if (!input.termId && input.termSlug) query = query.eq('slug', input.termSlug);
  const { data: row } = await query.maybeSingle();
  if (!row) return null;

  const node = row.node_id
    ? (await db.from('nodes').select('id, slug, title').eq('id', row.node_id).maybeSingle()).data
    : null;

  const evidences = await getGlossaryEvidences(universe.id, row.node_id, row.evidence_ids ?? [], row.tags ?? []);
  const questionPrompts = await getGlossaryQuestions(universe.id, row.node_id, row.question_prompts ?? [], row.term);
  const relatedNodes = await getRelatedNodes(universe.id, row.node_id, row.tags ?? []);

  return {
    id: row.id,
    slug: row.slug,
    term: row.term,
    shortDef: row.short_def ?? '',
    body: row.body ?? row.short_def ?? '',
    tags: row.tags ?? [],
    node: node ? { id: node.id, slug: node.slug, title: node.title } : null,
    evidences,
    questionPrompts,
    relatedNodes,
  };
}

async function getGlossaryEvidences(universeId: string, nodeId: string | null, evidenceIds: string[], tags: string[]) {
  const db = getSupabaseServerClient();
  if (!db) return [];

  let selectedEvidenceIds = evidenceIds.filter(Boolean);
  if (selectedEvidenceIds.length === 0 && nodeId) {
    const { data: linked } = await db
      .from('node_evidences')
      .select('evidence_id')
      .eq('universe_id', universeId)
      .eq('node_id', nodeId)
      .order('pin_rank', { ascending: true })
      .limit(6);
    selectedEvidenceIds = (linked ?? []).map((item) => item.evidence_id).filter(Boolean);
  }
  if (selectedEvidenceIds.length === 0 && tags.length > 0) {
    const { data: nodes } = await db.from('nodes').select('id').eq('universe_id', universeId).overlaps('tags', tags).limit(6);
    const nodeIds = (nodes ?? []).map((item) => item.id);
    if (nodeIds.length > 0) {
      const { data: linked } = await db.from('node_evidences').select('evidence_id').eq('universe_id', universeId).in('node_id', nodeIds).limit(6);
      selectedEvidenceIds = (linked ?? []).map((item) => item.evidence_id).filter(Boolean);
    }
  }
  if (selectedEvidenceIds.length === 0) return [];

  const { data: evsRaw } = await db
    .from('evidences')
    .select('id, title, summary, document_id, chunk_id')
    .eq('universe_id', universeId)
    .in('id', selectedEvidenceIds)
    .limit(8);
  const evs = evsRaw ?? [];
  const chunkIds = Array.from(new Set(evs.map((ev) => ev.chunk_id).filter(Boolean)));
  const docIds = Array.from(new Set(evs.map((ev) => ev.document_id).filter(Boolean)));
  const [{ data: chunksRaw }, { data: docsRaw }] = await Promise.all([
    chunkIds.length > 0 ? db.from('chunks').select('id, page_start, page_end').in('id', chunkIds) : Promise.resolve({ data: [] as Array<{ id: string; page_start: number | null; page_end: number | null }> }),
    docIds.length > 0 ? db.from('documents').select('id, title, year, is_deleted').in('id', docIds).eq('is_deleted', false) : Promise.resolve({ data: [] as Array<{ id: string; title: string; year: number | null; is_deleted: boolean }> }),
  ]);
  const chunkById = new Map((chunksRaw ?? []).map((chunk) => [chunk.id, chunk]));
  const docById = new Map((docsRaw ?? []).map((doc) => [doc.id, doc]));

  return evs.map((ev) => {
    const chunk = ev.chunk_id ? chunkById.get(ev.chunk_id) : null;
    const doc = ev.document_id ? docById.get(ev.document_id) : null;
    return {
      id: ev.id,
      title: ev.title,
      summary: ev.summary,
      documentId: ev.document_id ?? null,
      documentTitle: doc?.title ?? null,
      year: doc?.year ?? null,
      pageStart: chunk?.page_start ?? null,
      pageEnd: chunk?.page_end ?? null,
    };
  });
}

async function getGlossaryQuestions(universeId: string, nodeId: string | null, prompts: string[], term: string) {
  if (prompts.length > 0) return prompts.slice(0, 6);
  const db = getSupabaseServerClient();
  if (!db) return [`O que as evidencias dizem sobre ${term}?`];
  if (nodeId) {
    const { data } = await db
      .from('node_questions')
      .select('question')
      .eq('universe_id', universeId)
      .eq('node_id', nodeId)
      .order('pin_rank', { ascending: true })
      .limit(6);
    const list = (data ?? []).map((item) => item.question).filter(Boolean);
    if (list.length > 0) return list;
  }
  return [
    `O que as evidencias mostram sobre ${term}?`,
    `Quais lacunas de pesquisa existem sobre ${term}?`,
    `Que riscos e impactos aparecem ligados a ${term}?`,
  ];
}

async function getRelatedNodes(universeId: string, nodeId: string | null, tags: string[]) {
  const db = getSupabaseServerClient();
  if (!db) return [];
  if (nodeId) {
    const { data } = await db.from('nodes').select('id, slug, title').eq('id', nodeId).limit(1);
    return (data ?? []).map((node) => ({ id: node.id, slug: node.slug, title: node.title }));
  }
  if (tags.length > 0) {
    const { data } = await db.from('nodes').select('id, slug, title').eq('universe_id', universeId).overlaps('tags', tags).limit(6);
    return (data ?? []).map((node) => ({ id: node.id, slug: node.slug, title: node.title }));
  }
  return [];
}
