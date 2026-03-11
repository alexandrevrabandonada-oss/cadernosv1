import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { canWriteAdminContent, requireUser } from '@/lib/auth/requireRole';
import { listBootstrappedMockUniverses } from '@/lib/universe/bootstrapMock';

export type AdminUniverse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_url: string | null;
  ui_theme: string | null;
  published: boolean | null;
  published_at: string | null;
  is_featured: boolean;
  featured_rank: number;
  focus_note: string | null;
  focus_override: boolean;
  created_at: string;
};

export type AdminNode = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  summary: string;
  tags: string[];
  created_at: string;
};

export type AdminDocument = {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
  abstract: string | null;
  pdf_url: string | null;
  import_source: string | null;
  kind: 'upload' | 'doi' | 'url';
  source_url: string | null;
  storage_path: string | null;
  status: 'uploaded' | 'processed' | 'link_only' | 'error';
  text_quality_score: number | null;
  text_quality_flags: string[] | null;
  empty_pages_count: number | null;
  pages_count: number | null;
  repeated_lines_top: string[] | null;
  ingest_preset: 'default' | 'aggressive_dedupe' | 'no_dedupe' | 'short_chunks' | 'long_chunks';
  last_processed_at: string | null;
  is_deleted: boolean;
  created_at: string;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

export function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function getAdminDb() {
  return getSupabaseServiceRoleClient();
}

function buildSeededAdminUniverse(input: { id?: string; slug: string }): AdminUniverse {
  const slug = input.slug;
  const title = slug
    .split('-')
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(' ');
  return {
    id: input.id ?? `mock-${slug}`,
    slug,
    title: title || 'Demo',
    summary: `Universo mock para ${slug}.`,
    cover_url: null,
    ui_theme: null,
    published: true,
    published_at: new Date().toISOString(),
    is_featured: slug === 'exemplo' || slug === 'matematica',
    featured_rank: slug === 'exemplo' ? 1 : slug === 'matematica' ? 2 : 99,
    focus_note: slug === 'exemplo' ? 'Recorte principal da vitrine publica.' : null,
    focus_override: slug === 'exemplo',
    created_at: new Date().toISOString(),
  };
}

function listMockAdminUniverses() {
  const defaults = [
    buildSeededAdminUniverse({ slug: 'exemplo' }),
    buildSeededAdminUniverse({ slug: 'matematica' }),
    buildSeededAdminUniverse({ slug: 'universo-mvp' }),
  ];
  const extra = listBootstrappedMockUniverses().map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    cover_url: null,
    ui_theme: null,
    published: item.published,
    published_at: item.publishedAt,
    is_featured: item.isFeatured,
    featured_rank: item.featuredRank,
    focus_note: item.focusNote,
    focus_override: item.focusOverride,
    created_at: item.createdAt,
  } satisfies AdminUniverse));
  const map = new Map<string, AdminUniverse>();
  for (const universe of [...defaults, ...extra]) {
    map.set(universe.slug, universe);
  }
  return [...map.values()].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export async function hasAdminWriteAccess() {
  return canWriteAdminContent();
}

export async function listUniverses() {
  await requireUser();
  const db = getAdminDb();
  if (!db) {
    if (process.env.TEST_SEED === '1') {
      return listMockAdminUniverses();
    }
    return [];
  }

  const { data } = await db
    .from('universes')
    .select('id, slug, title, summary, cover_url, ui_theme, published, published_at, is_featured, featured_rank, focus_note, focus_override, created_at')
    .order('created_at', { ascending: false });

  return (data ?? []) as AdminUniverse[];
}

export async function getUniverseById(id: string) {
  await requireUser();
  const db = getAdminDb();
  if (!db) {
    if (process.env.TEST_SEED === '1') {
      return listMockAdminUniverses().find((item) => item.id === id) ?? null;
    }
    return null;
  }

  const { data } = await db
    .from('universes')
    .select('id, slug, title, summary, cover_url, ui_theme, published, published_at, is_featured, featured_rank, focus_note, focus_override, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!data && process.env.TEST_SEED === '1') {
    return listMockAdminUniverses().find((item) => item.id === id) ?? null;
  }

  return (data ?? null) as AdminUniverse | null;
}

export async function listNodes(universeId: string) {
  await requireUser();
  const db = getAdminDb();
  if (!db) return [];

  const { data } = await db
    .from('nodes')
    .select('id, slug, title, kind, summary, tags, created_at')
    .eq('universe_id', universeId)
    .order('created_at', { ascending: false });

  return (data ?? []) as AdminNode[];
}

export async function listDocuments(universeId: string) {
  await requireUser();
  const db = getAdminDb();
  if (!db) return [];

  const { data } = await db
    .from('documents')
    .select(
      'id, title, authors, year, journal, doi, abstract, pdf_url, import_source, kind, source_url, storage_path, status, text_quality_score, text_quality_flags, empty_pages_count, pages_count, repeated_lines_top, ingest_preset, last_processed_at, is_deleted, created_at',
    )
    .eq('universe_id', universeId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  return (data ?? []) as AdminDocument[];
}
