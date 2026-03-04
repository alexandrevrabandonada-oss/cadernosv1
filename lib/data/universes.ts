import 'server-only';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseMock } from '@/lib/mock/universe';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type UniverseRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_url: string | null;
  ui_theme: string | null;
  published_at: string | null;
  published: boolean | null;
  tags: string[];
  hasHighlights?: boolean;
};

export function isUniversePublished(universe: Pick<UniverseRecord, 'published_at' | 'published'> | null | undefined) {
  if (!universe) return false;
  return Boolean(universe.published_at || universe.published);
}

function normalizeTags(tags: unknown) {
  if (!Array.isArray(tags)) return [] as string[];
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 6);
}

export async function listPublishedUniverses(options: { q?: string } = {}) {
  const q = options.q?.trim() ?? '';
  const db = getSupabaseServerClient();
  if (!db) {
    const candidates = ['exemplo', 'matematica', 'universo-mvp'].map((slug) => getUniverseMock(slug));
    return candidates
      .filter((mock) =>
        q ? `${mock.title} ${mock.summary}`.toLowerCase().includes(q.toLowerCase()) : true,
      )
      .map((mock) => ({
        id: `mock-${mock.slug}`,
        slug: mock.slug,
        title: mock.title,
        summary: mock.summary,
        cover_url: null,
        ui_theme: null,
        published_at: new Date().toISOString(),
        published: true,
        tags: [],
        hasHighlights: false,
      }));
  }

  const query = db
    .from('universes')
    .select('id, slug, title, summary, cover_url, ui_theme, published_at, published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(60);

  const { data } = await query;
  const universes = (data ?? []) as Array<Omit<UniverseRecord, 'tags'>>;
  if (universes.length === 0) return [];

  const universeIds = universes.map((u) => u.id);
  const { data: nodes } = await db
    .from('nodes')
    .select('universe_id, tags')
    .in('universe_id', universeIds)
    .limit(600);

  const tagsByUniverse = new Map<string, string[]>();
  for (const node of nodes ?? []) {
    const current = tagsByUniverse.get(node.universe_id) ?? [];
    const merged = Array.from(new Set([...current, ...normalizeTags(node.tags)])).slice(0, 8);
    tagsByUniverse.set(node.universe_id, merged);
  }

  const { data: highlightsRows } = await db
    .from('universe_highlights')
    .select('universe_id')
    .in('universe_id', universeIds);
  const highlightSet = new Set((highlightsRows ?? []).map((row) => row.universe_id));

  const mapped = universes.map((universe) => ({
    ...universe,
    tags: tagsByUniverse.get(universe.id) ?? [],
    hasHighlights: highlightSet.has(universe.id),
  }));

  if (!q) return mapped;
  const qLower = q.toLowerCase();
  return mapped.filter((universe) => {
    const hay = `${universe.title} ${universe.summary}`.toLowerCase();
    if (hay.includes(qLower)) return true;
    return universe.tags.some((tag) => tag.toLowerCase().includes(qLower));
  });
}

export async function getUniverseBySlug(
  slug: string,
  options: { includeUnpublishedForRole?: boolean } = {},
): Promise<UniverseRecord | null> {
  const includeUnpublishedForRole = Boolean(options.includeUnpublishedForRole);
  const session = includeUnpublishedForRole ? await getCurrentSession() : null;
  const privileged = Boolean(session && (session.role === 'admin' || session.role === 'editor'));

  const client = privileged ? getSupabaseServiceRoleClient() : getSupabaseServerClient();
  if (!client) {
    const mock = getUniverseMock(slug);
    return {
      id: `mock-${mock.slug}`,
      slug: mock.slug,
      title: mock.title,
      summary: mock.summary,
      cover_url: null,
      ui_theme: null,
      published_at: new Date().toISOString(),
      published: true,
      tags: [],
      hasHighlights: false,
    };
  }

  let query = client
    .from('universes')
    .select('id, slug, title, summary, cover_url, ui_theme, published_at, published')
    .eq('slug', slug)
    .limit(1);

  if (!privileged) {
    query = query.not('published_at', 'is', null);
  }

  const { data } = await query.maybeSingle();
  if (!data) return null;

  return {
    ...(data as Omit<UniverseRecord, 'tags'>),
    tags: [],
  };
}

export async function getUniverseAccessBySlug(slug: string) {
  const universe = await getUniverseBySlug(slug, { includeUnpublishedForRole: true });
  if (!universe) return { universe: null, canPreview: false, published: false };

  const published = isUniversePublished(universe);
  if (published) return { universe, canPreview: false, published: true };

  const session = await getCurrentSession();
  const canPreview = Boolean(session && (session.role === 'admin' || session.role === 'editor'));
  return { universe, canPreview, published: false };
}
