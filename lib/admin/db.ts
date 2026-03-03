import 'server-only';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export type AdminUniverse = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_url: string | null;
  ui_theme: string | null;
  published: boolean;
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
  source_url: string | null;
  storage_path: string | null;
  status: 'uploaded' | 'processed';
  is_deleted: boolean;
  created_at: string;
};

export function isAdminModeEnabled() {
  return process.env.ADMIN_MODE === '1';
}

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
  if (!isAdminModeEnabled()) {
    return null;
  }
  return getSupabaseServiceRoleClient();
}

export async function listUniverses() {
  const db = getAdminDb();
  if (!db) return [];

  const { data } = await db
    .from('universes')
    .select('id, slug, title, summary, cover_url, ui_theme, published, created_at')
    .order('created_at', { ascending: false });

  return (data ?? []) as AdminUniverse[];
}

export async function getUniverseById(id: string) {
  const db = getAdminDb();
  if (!db) return null;

  const { data } = await db
    .from('universes')
    .select('id, slug, title, summary, cover_url, ui_theme, published, created_at')
    .eq('id', id)
    .maybeSingle();

  return (data ?? null) as AdminUniverse | null;
}

export async function listNodes(universeId: string) {
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
  const db = getAdminDb();
  if (!db) return [];

  const { data } = await db
    .from('documents')
    .select('id, title, authors, year, source_url, storage_path, status, is_deleted, created_at')
    .eq('universe_id', universeId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  return (data ?? []) as AdminDocument[];
}
