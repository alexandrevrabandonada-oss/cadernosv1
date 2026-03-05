import 'server-only';
import { getHubData } from '@/lib/data/universe';
import { listPublishedUniverses } from '@/lib/data/universes';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type OfflineSeed = {
  universeSlugs: string[];
  sharePages: string[];
  updatedAt: string;
};

function normalizeRoute(route: string | null | undefined) {
  if (!route) return '';
  const value = String(route).trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      return `${parsed.pathname}${parsed.search}`.trim();
    } catch {
      return '';
    }
  }
  return value;
}

function isPublicShareRoute(route: string) {
  return /^\/c\/[^/]+\/s(\/|$)/.test(route);
}

async function getTopShareRoutes24h(limit: number) {
  const db = getSupabaseServiceRoleClient();
  if (!db) return [] as string[];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from('analytics_events')
    .select('route, event_name, created_at')
    .in('event_name', ['share_view', 'page_view'])
    .gte('created_at', since)
    .limit(50_000);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const route = normalizeRoute(row.route);
    if (!isPublicShareRoute(route)) continue;
    counts.set(route, (counts.get(route) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([route]) => route);
}

async function buildShareFallbackFromHighlights(universeSlugs: string[], limit: number) {
  const routes: string[] = [];
  for (const slug of universeSlugs) {
    const hub = await getHubData(slug);
    routes.push(`/c/${slug}/s`);
    for (const item of hub.highlights.evidences.slice(0, 3)) {
      routes.push(`/c/${slug}/s/evidence/${item.id}`);
    }
    for (const item of hub.highlights.events.slice(0, 2)) {
      routes.push(`/c/${slug}/s/event/${item.id}`);
    }
    if (routes.length >= limit) break;
  }
  return Array.from(new Set(routes)).slice(0, limit);
}

export async function getPublicOfflineSeed(): Promise<OfflineSeed> {
  const universes = await listPublishedUniverses();
  const universeSlugs = universes.slice(0, 3).map((item) => item.slug);

  const shareFromAnalytics = await getTopShareRoutes24h(10);
  const sharePages =
    shareFromAnalytics.length > 0
      ? shareFromAnalytics
      : await buildShareFallbackFromHighlights(universeSlugs, 10);

  return {
    universeSlugs,
    sharePages: Array.from(new Set(sharePages)).slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}

