import 'server-only';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseMock } from '@/lib/mock/universe';
import { getBootstrappedMockUniverseBySlug, listBootstrappedMockUniverses } from '@/lib/universe/bootstrapMock';
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
  is_featured: boolean;
  featured_rank: number;
  focus_note: string | null;
  focus_override: boolean;
};

export function isUniversePublished(universe: Pick<UniverseRecord, 'published_at' | 'published'> | null | undefined) {
  if (!universe) return false;
  return Boolean(universe.published_at || universe.published);
}

function normalizeTags(tags: unknown) {
  if (!Array.isArray(tags)) return [] as string[];
  return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6);
}

function buildMockUniverseRecord(slug: string, overrides: Partial<UniverseRecord> = {}): UniverseRecord {
  const bootstrapped = getBootstrappedMockUniverseBySlug(slug);
  const mock = getUniverseMock(slug);
  return {
    id: overrides.id ?? bootstrapped?.id ?? `mock-${mock.slug}`,
    slug: mock.slug,
    title: mock.title,
    summary: mock.summary,
    cover_url: null,
    ui_theme: null,
    published_at: overrides.published_at ?? bootstrapped?.publishedAt ?? new Date().toISOString(),
    published: overrides.published ?? bootstrapped?.published ?? true,
    tags: overrides.tags ?? bootstrapped?.coreNodes.flatMap((node) => node.tags).slice(0, 6) ?? [],
    hasHighlights: overrides.hasHighlights ?? false,
    is_featured: overrides.is_featured ?? bootstrapped?.isFeatured ?? mock.slug === 'exemplo',
    featured_rank: overrides.featured_rank ?? bootstrapped?.featuredRank ?? (mock.slug === 'exemplo' ? 1 : mock.slug === 'matematica' ? 2 : 3),
    focus_note:
      overrides.focus_note ??
      bootstrapped?.focusNote ??
      (mock.slug === 'exemplo' ? 'Recorte vivo com prova, linha e debate ja costurados na entrada.' : null),
    focus_override: overrides.focus_override ?? bootstrapped?.focusOverride ?? mock.slug === 'exemplo',
  };
}

function listMockCandidates() {
  const defaults = [
    buildMockUniverseRecord('exemplo'),
    buildMockUniverseRecord('matematica', { is_featured: true, featured_rank: 2 }),
    buildMockUniverseRecord('universo-mvp', { is_featured: false, featured_rank: 99 }),
  ];
  const extra = listBootstrappedMockUniverses().map((item) =>
    buildMockUniverseRecord(item.slug, {
      id: item.id,
      published: item.published,
      published_at: item.publishedAt,
      is_featured: item.isFeatured,
      featured_rank: item.featuredRank,
      focus_note: item.focusNote,
      focus_override: item.focusOverride,
      tags: item.coreNodes.flatMap((node) => node.tags).slice(0, 6),
    }),
  );
  const bySlug = new Map<string, UniverseRecord>();
  for (const candidate of [...defaults, ...extra]) {
    bySlug.set(candidate.slug, candidate);
  }
  return [...bySlug.values()];
}

export async function listPublishedUniverses(options: { q?: string } = {}) {
  const q = options.q?.trim() ?? '';
  const forceMock = process.env.TEST_SEED === '1';
  const db = getSupabaseServerClient();
  if (forceMock || !db) {
    return listMockCandidates()
      .filter((mock) => isUniversePublished(mock))
      .filter((mock) => (q ? `${mock.title} ${mock.summary}`.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => {
        if (a.focus_override !== b.focus_override) return a.focus_override ? -1 : 1;
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        if (a.featured_rank !== b.featured_rank) return a.featured_rank - b.featured_rank;
        return (b.published_at ?? '').localeCompare(a.published_at ?? '');
      });
  }

  const { data } = await db
    .from('universes')
    .select('id, slug, title, summary, cover_url, ui_theme, published_at, published, is_featured, featured_rank, focus_note, focus_override')
    .not('published_at', 'is', null)
    .order('focus_override', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('featured_rank', { ascending: true })
    .order('published_at', { ascending: false })
    .limit(60);

  const universes = (data ?? []) as Array<Omit<UniverseRecord, 'tags' | 'hasHighlights'>>;
  if (universes.length === 0) return [];

  const universeIds = universes.map((u) => u.id);
  const { data: nodes } = await db.from('nodes').select('universe_id, tags').in('universe_id', universeIds).limit(600);
  const tagsByUniverse = new Map<string, string[]>();
  for (const node of nodes ?? []) {
    const current = tagsByUniverse.get(node.universe_id) ?? [];
    const merged = Array.from(new Set([...current, ...normalizeTags(node.tags)])).slice(0, 8);
    tagsByUniverse.set(node.universe_id, merged);
  }
  const { data: highlightsRows } = await db.from('universe_highlights').select('universe_id').in('universe_id', universeIds);
  const highlightSet = new Set((highlightsRows ?? []).map((row) => row.universe_id));

  const mapped = universes.map((universe) => ({
    ...universe,
    is_featured: Boolean(universe.is_featured),
    featured_rank: Number(universe.featured_rank ?? 0),
    focus_note: universe.focus_note ?? null,
    focus_override: Boolean(universe.focus_override),
    tags: tagsByUniverse.get(universe.id) ?? [],
    hasHighlights: highlightSet.has(universe.id),
  }));

  if (!q) return mapped;
  const qLower = q.toLowerCase();
  return mapped.filter((universe) => {
    const hay = `${universe.title} ${universe.summary} ${universe.focus_note ?? ''}`.toLowerCase();
    if (hay.includes(qLower)) return true;
    return universe.tags.some((tag) => tag.toLowerCase().includes(qLower));
  });
}

export async function getUniverseBySlug(
  slug: string,
  options: { includeUnpublishedForRole?: boolean } = {},
): Promise<UniverseRecord | null> {
  const includeUnpublishedForRole = Boolean(options.includeUnpublishedForRole);
  const forceMock = process.env.TEST_SEED === '1';
  const session = includeUnpublishedForRole ? await getCurrentSession() : null;
  const privileged = Boolean(session && (session.role === 'admin' || session.role === 'editor'));

  const client = forceMock ? null : privileged ? getSupabaseServiceRoleClient() : getSupabaseServerClient();
  if (!client) {
    return buildMockUniverseRecord(slug);
  }

  let query = client
    .from('universes')
    .select('id, slug, title, summary, cover_url, ui_theme, published_at, published, is_featured, featured_rank, focus_note, focus_override')
    .eq('slug', slug)
    .limit(1);

  if (!privileged) {
    query = query.not('published_at', 'is', null);
  }

  const { data } = await query.maybeSingle();
  if (!data) return null;
  return {
    ...(data as Omit<UniverseRecord, 'tags' | 'hasHighlights'>),
    is_featured: Boolean(data.is_featured),
    featured_rank: Number(data.featured_rank ?? 0),
    focus_note: data.focus_note ?? null,
    focus_override: Boolean(data.focus_override),
    tags: [],
    hasHighlights: false,
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
