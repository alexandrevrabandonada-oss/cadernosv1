import 'server-only';
import { getUniverseMock } from '@/lib/mock/universe';
import { getSupabaseServerClient, isSupabaseServerEnvConfigured } from '@/lib/supabase/server';
import type { TimelineFilters } from '@/lib/filters/timelineFilters';

export type TimelineNodeFilter = {
  id: string;
  slug: string;
  title: string;
  kind: string | null;
  tags: string[];
};

export type TimelineDocMeta = {
  id: string;
  title: string;
  year: number | null;
  sourceUrl: string | null;
};

export type TimelineItem = {
  id: string;
  title: string;
  summary: string;
  body: string | null;
  day: string | null;
  kind: string;
  tags: string[];
  sourceUrl: string | null;
  node: { id: string; slug: string; title: string } | null;
  document: TimelineDocMeta | null;
  createdAt: string;
};

export type TimelineListResult = {
  source: 'db' | 'mock';
  universeId: string;
  universeTitle: string;
  nodes: TimelineNodeFilter[];
  kindOptions: string[];
  tagOptions: string[];
  items: TimelineItem[];
  nextCursor: number | null;
};

type DbEventRow = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  kind: string | null;
  tags: string[] | null;
  source_url: string | null;
  node_id: string | null;
  document_id: string | null;
  day: string | null;
  event_date: string | null;
  created_at: string;
};

function clip(text: string, max = 210) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function normalizeKind(value: string | null | undefined) {
  const safe = (value ?? 'event').trim().toLowerCase();
  return safe || 'event';
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function applyLocalFilters(items: TimelineItem[], filters: TimelineFilters) {
  return items.filter((item) => {
    if (filters.kind.length > 0 && !filters.kind.includes(item.kind)) return false;
    if (filters.tags.length > 0) {
      const lowered = item.tags.map((tag) => tag.toLowerCase());
      if (!filters.tags.some((tag) => lowered.includes(tag))) return false;
    }
    const year = item.day ? Number(item.day.slice(0, 4)) : null;
    if (typeof filters.yearFrom === 'number' && typeof year === 'number' && year < filters.yearFrom) return false;
    if (typeof filters.yearTo === 'number' && typeof year === 'number' && year > filters.yearTo) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const blob = `${item.title} ${item.summary} ${item.body ?? ''}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (filters.node) {
      if (!item.node || item.node.slug !== filters.node) return false;
    }
    return true;
  });
}

function mockTimelineList(slug: string, filters: TimelineFilters, limit: number, cursor: number): TimelineListResult {
  const mock = getUniverseMock(slug);
  const now = new Date('2026-01-10T00:00:00.000Z');
  const nodes: TimelineNodeFilter[] = mock.coreNodes.map((node) => ({
    id: node.id,
    slug: node.slug ?? node.id,
    title: node.label,
    kind: 'core',
    tags: ['core'],
  }));

  const events: TimelineItem[] = mock.coreNodes.slice(0, 12).map((node, idx) => {
    const date = new Date(now);
    date.setMonth(now.getMonth() - idx * 3);
    const kind = idx % 4 === 0 ? 'report' : idx % 3 === 0 ? 'law' : idx % 2 === 0 ? 'news' : 'event';
    const nodeSlug = node.slug ?? node.id;
    return {
      id: `${slug}-timeline-${idx + 1}`,
      title: `${node.label}: marco ${idx + 1}`,
      summary: clip(node.summary ?? `Atualizacao de ${node.label} na linha do tempo.`),
      body: `${node.summary ?? `Descricao detalhada sobre ${node.label}.`} Registro de marco editorial no universo.`,
      day: date.toISOString().slice(0, 10),
      kind,
      tags: uniq(['core', nodeSlug, kind]).slice(0, 4),
      sourceUrl: null,
      node: { id: node.id, slug: nodeSlug, title: node.label },
      document: null,
      createdAt: date.toISOString(),
    };
  });

  const filtered = applyLocalFilters(events, filters);
  const page = filtered.slice(cursor, cursor + limit);
  const nextCursor = filtered.length > cursor + limit ? cursor + limit : null;
  const kindOptions = uniq(events.map((item) => item.kind)).sort();
  const tagOptions = uniq(events.flatMap((item) => item.tags)).sort();

  return {
    source: 'mock',
    universeId: mock.slug,
    universeTitle: mock.title,
    nodes,
    kindOptions,
    tagOptions,
    items: page,
    nextCursor,
  };
}

async function enrichEvents(universeId: string, rows: DbEventRow[]): Promise<TimelineItem[]> {
  const db = getSupabaseServerClient();
  if (!db || rows.length === 0) return [];

  const nodeIds = uniq(rows.map((row) => row.node_id).filter((value): value is string => Boolean(value)));
  const docIds = uniq(rows.map((row) => row.document_id).filter((value): value is string => Boolean(value)));

  const [{ data: nodesRaw }, { data: docsRaw }] = await Promise.all([
    nodeIds.length > 0
      ? db.from('nodes').select('id, slug, title').in('id', nodeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string; title: string }> }),
    docIds.length > 0
      ? db
          .from('documents')
          .select('id, title, year, source_url, is_deleted')
          .eq('universe_id', universeId)
          .in('id', docIds)
          .eq('is_deleted', false)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; year: number | null; source_url: string | null; is_deleted: boolean }> }),
  ]);

  const nodeById = new Map((nodesRaw ?? []).map((item) => [item.id, item]));
  const docById = new Map(
    (docsRaw ?? [])
      .filter((doc) => !doc.is_deleted)
      .map((doc) => [doc.id, doc]),
  );

  return rows.map((row) => {
    const node = row.node_id ? nodeById.get(row.node_id) : null;
    const doc = row.document_id ? docById.get(row.document_id) : null;
    const day = row.day ?? row.event_date ?? null;
    return {
      id: row.id,
      title: row.title,
      summary: clip(row.summary ?? row.body ?? ''),
      body: row.body ?? null,
      day,
      kind: normalizeKind(row.kind),
      tags: (row.tags ?? []).map((tag) => String(tag).trim()).filter(Boolean),
      sourceUrl: row.source_url ?? doc?.source_url ?? null,
      node: node ? { id: node.id, slug: node.slug, title: node.title } : null,
      document: doc
        ? {
            id: doc.id,
            title: doc.title,
            year: doc.year,
            sourceUrl: doc.source_url ?? null,
          }
        : null,
      createdAt: row.created_at,
    } satisfies TimelineItem;
  });
}

export async function listTimelineItems(input: {
  slug: string;
  filters: TimelineFilters;
  limit: number;
  cursor?: number;
}): Promise<TimelineListResult> {
  const limit = Math.max(1, Math.min(40, input.limit));
  const cursor = Math.max(0, input.cursor ?? input.filters.cursor ?? 0);

  if (!isSupabaseServerEnvConfigured()) {
    return mockTimelineList(input.slug, input.filters, limit, cursor);
  }

  const db = getSupabaseServerClient();
  if (!db) {
    return mockTimelineList(input.slug, input.filters, limit, cursor);
  }

  const { data: universe } = await db.from('universes').select('id, title').eq('slug', input.slug).maybeSingle();
  if (!universe) {
    return mockTimelineList(input.slug, input.filters, limit, cursor);
  }

  const { data: nodesRaw } = await db
    .from('nodes')
    .select('id, slug, title, kind, tags')
    .eq('universe_id', universe.id)
    .order('title', { ascending: true });
  const nodes: TimelineNodeFilter[] = (nodesRaw ?? []).map((node) => ({
    id: node.id,
    slug: node.slug,
    title: node.title,
    kind: node.kind ?? null,
    tags: node.tags ?? [],
  }));
  const nodeSlugToId = new Map(nodes.map((node) => [node.slug, node.id]));

  let query = db
    .from('events')
    .select('id, title, summary, body, kind, tags, source_url, node_id, document_id, day, event_date, created_at')
    .eq('universe_id', universe.id)
    .order('day', { ascending: false, nullsFirst: false })
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(cursor, cursor + limit + 120);

  if (input.filters.kind.length > 0) query = query.in('kind', input.filters.kind);
  if (input.filters.node) {
    const nodeId = nodeSlugToId.get(input.filters.node);
    if (nodeId) query = query.eq('node_id', nodeId);
    else return { source: 'db', universeId: universe.id, universeTitle: universe.title, nodes, kindOptions: [], tagOptions: [], items: [], nextCursor: null };
  }
  if (input.filters.tags.length > 0) query = query.overlaps('tags', input.filters.tags);
  if (input.filters.q) query = query.or(`title.ilike.%${input.filters.q}%,summary.ilike.%${input.filters.q}%,body.ilike.%${input.filters.q}%`);
  if (typeof input.filters.yearFrom === 'number') query = query.gte('day', `${input.filters.yearFrom}-01-01`);
  if (typeof input.filters.yearTo === 'number') query = query.lte('day', `${input.filters.yearTo}-12-31`);

  const { data: rowsRaw } = await query;
  const rows = (rowsRaw ?? []) as DbEventRow[];
  const items = applyLocalFilters(await enrichEvents(universe.id, rows), input.filters);
  const page = items.slice(0, limit);
  const nextCursor = items.length > limit ? cursor + limit : null;

  const { data: facetsRaw } = await db
    .from('events')
    .select('kind, tags')
    .eq('universe_id', universe.id)
    .order('created_at', { ascending: false })
    .limit(250);
  const kindOptions = uniq((facetsRaw ?? []).map((item) => normalizeKind(item.kind))).sort();
  const tagOptions = uniq((facetsRaw ?? []).flatMap((item) => item.tags ?? []).filter(Boolean)).sort();

  return {
    source: 'db',
    universeId: universe.id,
    universeTitle: universe.title,
    nodes,
    kindOptions,
    tagOptions,
    items: page,
    nextCursor,
  };
}

export async function getTimelineDetail(eventId: string): Promise<TimelineItem | null> {
  if (!eventId) return null;
  const db = getSupabaseServerClient();
  if (!db) return null;
  const { data: rowRaw } = await db
    .from('events')
    .select('id, title, summary, body, kind, tags, source_url, node_id, document_id, day, event_date, created_at, universe_id')
    .eq('id', eventId)
    .maybeSingle();
  if (!rowRaw) return null;
  const row = rowRaw as DbEventRow & { universe_id: string };
  const enriched = await enrichEvents(row.universe_id, [row]);
  return enriched[0] ?? null;
}
