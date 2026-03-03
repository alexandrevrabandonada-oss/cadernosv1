import 'server-only';
import { getUniverseMock } from '@/lib/mock/universe';
import { getSupabaseServerClient, isSupabaseServerEnvConfigured } from '@/lib/supabase/server';

export type TimelineNodeFilter = {
  id: string;
  title: string;
};

export type TimelineEvent = {
  id: string;
  title: string;
  summary: string;
  eventDate: string | null;
  periodLabel: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
  evidenceId: string | null;
  evidenceTitle: string | null;
  documentId: string | null;
  documentTitle: string | null;
  documentYear: number | null;
};

export type TimelineData = {
  source: 'db' | 'mock';
  universeTitle: string;
  nodes: TimelineNodeFilter[];
  events: TimelineEvent[];
};

type TimelineFilters = {
  from?: string;
  to?: string;
  nodeId?: string;
};

function mockTimeline(slug: string, filters: TimelineFilters): TimelineData {
  const mock = getUniverseMock(slug);
  const nodes = mock.coreNodes.map((node) => ({ id: node.id, title: node.label }));
  const base = new Date('2023-01-01');
  const events: TimelineEvent[] = mock.coreNodes.slice(0, 6).map((node, idx) => {
    const date = new Date(base);
    date.setMonth(base.getMonth() + idx * 3);
    return {
      id: `${slug}-ev-${idx + 1}`,
      title: `Evento: ${node.label}`,
      summary: node.summary ?? `Evolucao de ${node.label} na linha temporal.`,
      eventDate: date.toISOString().slice(0, 10),
      periodLabel: idx < 2 ? 'Fase 1' : idx < 4 ? 'Fase 2' : 'Fase 3',
      nodeId: node.id,
      nodeTitle: node.label,
      evidenceId: null,
      evidenceTitle: null,
      documentId: null,
      documentTitle: null,
      documentYear: null,
    };
  });

  const filtered = events.filter((event) => {
    if (filters.nodeId && event.nodeId !== filters.nodeId) return false;
    if (filters.from && event.eventDate && event.eventDate < filters.from) return false;
    if (filters.to && event.eventDate && event.eventDate > filters.to) return false;
    return true;
  });

  return {
    source: 'mock',
    universeTitle: mock.title,
    nodes,
    events: filtered,
  };
}

export async function getTimelineData(slug: string, filters: TimelineFilters): Promise<TimelineData> {
  if (!isSupabaseServerEnvConfigured()) {
    return mockTimeline(slug, filters);
  }

  const db = getSupabaseServerClient();
  if (!db) {
    return mockTimeline(slug, filters);
  }

  const { data: universe } = await db.from('universes').select('id, title').eq('slug', slug).maybeSingle();
  if (!universe) {
    return mockTimeline(slug, filters);
  }

  const { data: nodesRaw } = await db
    .from('nodes')
    .select('id, title')
    .eq('universe_id', universe.id)
    .order('title', { ascending: true });
  const nodes = (nodesRaw ?? []).map((node) => ({ id: node.id, title: node.title }));

  let query = db
    .from('events')
    .select('id, title, summary, event_date, period_label, node_id, evidence_id, document_id')
    .eq('universe_id', universe.id)
    .order('event_date', { ascending: true, nullsFirst: false });

  if (filters.nodeId) query = query.eq('node_id', filters.nodeId);
  if (filters.from) query = query.gte('event_date', filters.from);
  if (filters.to) query = query.lte('event_date', filters.to);

  const { data: eventsRaw } = await query;
  if (!eventsRaw || eventsRaw.length === 0) {
    return {
      source: 'db',
      universeTitle: universe.title,
      nodes,
      events: [],
    };
  }

  const evidenceIds = Array.from(new Set(eventsRaw.map((event) => event.evidence_id).filter(Boolean)));
  const documentIds = Array.from(new Set(eventsRaw.map((event) => event.document_id).filter(Boolean)));

  const [{ data: evidencesRaw }, { data: documentsRaw }] = await Promise.all([
    evidenceIds.length > 0
      ? db.from('evidences').select('id, title').in('id', evidenceIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    documentIds.length > 0
      ? db.from('documents').select('id, title, year, is_deleted').in('id', documentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; year: number | null; is_deleted: boolean }> }),
  ]);

  const nodeById = new Map(nodes.map((node) => [node.id, node.title]));
  const evidenceById = new Map((evidencesRaw ?? []).map((ev) => [ev.id, ev.title]));
  const documentById = new Map(
    (documentsRaw ?? [])
      .filter((doc) => !doc.is_deleted)
      .map((doc) => [doc.id, { title: doc.title, year: doc.year }]),
  );

  const events: TimelineEvent[] = eventsRaw.map((event) => {
    const doc = event.document_id ? documentById.get(event.document_id) : null;
    return {
      id: event.id,
      title: event.title,
      summary: event.summary,
      eventDate: event.event_date,
      periodLabel: event.period_label,
      nodeId: event.node_id,
      nodeTitle: event.node_id ? nodeById.get(event.node_id) ?? null : null,
      evidenceId: event.evidence_id,
      evidenceTitle: event.evidence_id ? evidenceById.get(event.evidence_id) ?? null : null,
      documentId: event.document_id,
      documentTitle: doc?.title ?? null,
      documentYear: doc?.year ?? null,
    };
  });

  return {
    source: 'db',
    universeTitle: universe.title,
    nodes,
    events,
  };
}
