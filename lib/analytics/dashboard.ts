import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

type EventRow = {
  event_name: string;
  route: string | null;
  object_type: string | null;
  object_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function since(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function routeSection(route: string | null) {
  if (!route) return '';
  const value = route.toLowerCase();
  if (value.includes('/provas')) return 'provas';
  if (value.includes('/debate')) return 'debate';
  if (value.includes('/tutor')) return 'tutor';
  if (value.includes('/linha')) return 'linha';
  if (value.includes('/mapa')) return 'mapa';
  if (value.includes('/glossario')) return 'glossario';
  const onlyPath = value.split('?')[0] ?? value;
  if (/\/c\/[^/]+\/?$/.test(onlyPath)) return 'hub';
  return '';
}

function groupCount<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export type UniverseAnalyticsDashboard = {
  universeId: string;
  last24h: {
    pageViews: number;
    shareViews: number;
    shareOpenAppClicks: number;
    shareOpenRatePct: number;
    topCtas: Array<{ cta: string; count: number }>;
  };
  last7d: {
    funnel: Array<{ step: string; count: number; ratePct: number }>;
    topNodes: Array<{ objectId: string; count: number }>;
    topEvidences: Array<{ objectId: string; count: number }>;
    insufficientByNode: Array<{ nodeId: string; insufficientRatePct: number; asks: number }>;
  };
};

export async function getUniverseAnalyticsDashboard(universeId: string): Promise<UniverseAnalyticsDashboard> {
  const db = getSupabaseServiceRoleClient();
  const fallback: UniverseAnalyticsDashboard = {
    universeId,
    last24h: {
      pageViews: 0,
      shareViews: 0,
      shareOpenAppClicks: 0,
      shareOpenRatePct: 0,
      topCtas: [],
    },
    last7d: {
      funnel: [
        { step: 'hub', count: 0, ratePct: 0 },
        { step: 'provas', count: 0, ratePct: 0 },
        { step: 'debate', count: 0, ratePct: 0 },
        { step: 'tutor', count: 0, ratePct: 0 },
        { step: 'share', count: 0, ratePct: 0 },
      ],
      topNodes: [],
      topEvidences: [],
      insufficientByNode: [],
    },
  };
  if (!db) return fallback;

  const [events24hRaw, events7dRaw, qaByNodeRaw] = await Promise.all([
    db
      .from('analytics_events')
      .select('event_name, route, object_type, object_id, meta, created_at')
      .eq('universe_id', universeId)
      .gte('created_at', since(24))
      .limit(20_000),
    db
      .from('analytics_events')
      .select('event_name, route, object_type, object_id, meta, created_at')
      .eq('universe_id', universeId)
      .gte('created_at', since(24 * 7))
      .limit(50_000),
    db
      .from('qa_threads')
      .select('node_id, mode')
      .eq('universe_id', universeId)
      .not('node_id', 'is', null)
      .gte('created_at', since(24 * 7))
      .limit(20_000),
  ]);

  const events24h = (events24hRaw.data ?? []) as EventRow[];
  const events7d = (events7dRaw.data ?? []) as EventRow[];
  const qaByNode = (qaByNodeRaw.data ?? []) as Array<{ node_id: string; mode: 'strict_ok' | 'insufficient' }>;

  const pageViews = events24h.filter((event) => event.event_name === 'page_view').length;
  const shareViews = events24h.filter((event) => event.event_name === 'share_view').length;
  const shareOpenAppClicks = events24h.filter((event) => event.event_name === 'share_open_app').length;
  const shareOpenRatePct = shareViews > 0 ? Number(((shareOpenAppClicks / shareViews) * 100).toFixed(2)) : 0;

  const ctaCounts = groupCount(
    events24h.filter((event) => event.event_name === 'cta_click'),
    (event) => String(event.meta?.cta ?? ''),
  );
  const topCtas = Array.from(ctaCounts.entries())
    .map(([cta, count]) => ({ cta, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const sectionSeen = new Set<string>();
  for (const event of events7d) {
    if (event.event_name !== 'page_view' && event.event_name !== 'share_view') continue;
    if (event.event_name === 'share_view') {
      sectionSeen.add('share');
      continue;
    }
    const section = routeSection(event.route);
    if (section) sectionSeen.add(section);
  }

  const sectionCounts = {
    hub: events7d.filter((event) => event.event_name === 'page_view' && routeSection(event.route) === 'hub').length,
    provas: events7d.filter((event) => event.event_name === 'page_view' && routeSection(event.route) === 'provas').length,
    debate: events7d.filter((event) => event.event_name === 'page_view' && routeSection(event.route) === 'debate').length,
    tutor: events7d.filter((event) => event.event_name === 'page_view' && routeSection(event.route) === 'tutor').length,
    share: events7d.filter((event) => event.event_name === 'share_view').length,
  };
  const hubBase = Math.max(1, sectionCounts.hub);
  const funnel = [
    { step: 'hub', count: sectionCounts.hub, ratePct: 100 },
    { step: 'provas', count: sectionCounts.provas, ratePct: Number(((sectionCounts.provas / hubBase) * 100).toFixed(2)) },
    { step: 'debate', count: sectionCounts.debate, ratePct: Number(((sectionCounts.debate / hubBase) * 100).toFixed(2)) },
    { step: 'tutor', count: sectionCounts.tutor, ratePct: Number(((sectionCounts.tutor / hubBase) * 100).toFixed(2)) },
    { step: 'share', count: sectionCounts.share, ratePct: Number(((sectionCounts.share / hubBase) * 100).toFixed(2)) },
  ];

  const topNodes = Array.from(
    groupCount(
      events7d.filter((event) => event.event_name === 'node_select' && typeof event.object_id === 'string'),
      (event) => event.object_id ?? '',
    ).entries(),
  )
    .map(([objectId, count]) => ({ objectId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topEvidences = Array.from(
    groupCount(
      events7d.filter((event) => event.event_name === 'evidence_click' && typeof event.object_id === 'string'),
      (event) => event.object_id ?? '',
    ).entries(),
  )
    .map(([objectId, count]) => ({ objectId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const nodeStats = new Map<string, { asks: number; insufficient: number }>();
  for (const row of qaByNode) {
    const current = nodeStats.get(row.node_id) ?? { asks: 0, insufficient: 0 };
    current.asks += 1;
    if (row.mode === 'insufficient') current.insufficient += 1;
    nodeStats.set(row.node_id, current);
  }
  const insufficientByNode = Array.from(nodeStats.entries())
    .map(([nodeId, stats]) => ({
      nodeId,
      asks: stats.asks,
      insufficientRatePct: stats.asks > 0 ? Number(((stats.insufficient / stats.asks) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.insufficientRatePct - a.insufficientRatePct || b.asks - a.asks)
    .slice(0, 5);

  return {
    universeId,
    last24h: {
      pageViews,
      shareViews,
      shareOpenAppClicks,
      shareOpenRatePct,
      topCtas,
    },
    last7d: {
      funnel,
      topNodes,
      topEvidences,
      insufficientByNode,
    },
  };
}

export async function getGlobalAnalyticsSummary24h() {
  const db = getSupabaseServiceRoleClient();
  if (!db) {
    return {
      topUniversesByShareOpenApp: [] as Array<{ universeId: string; shareOpenAppClicks: number }>,
      totalShareOpenAppClicks: 0,
    };
  }

  const { data } = await db
    .from('analytics_events')
    .select('universe_id, event_name')
    .eq('event_name', 'share_open_app')
    .gte('created_at', since(24))
    .not('universe_id', 'is', null)
    .limit(50_000);

  const counts = groupCount(
    (data ?? []).filter((row) => typeof row.universe_id === 'string'),
    (row) => String(row.universe_id),
  );
  const topUniversesByShareOpenApp = Array.from(counts.entries())
    .map(([universeId, shareOpenAppClicks]) => ({ universeId, shareOpenAppClicks }))
    .sort((a, b) => b.shareOpenAppClicks - a.shareOpenAppClicks)
    .slice(0, 5);

  return {
    topUniversesByShareOpenApp,
    totalShareOpenAppClicks: Array.from(counts.values()).reduce((acc, value) => acc + value, 0),
  };
}
