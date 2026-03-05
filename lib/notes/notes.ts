import 'server-only';
import { getCurrentSession } from '@/lib/auth/server';
import { getUniverseAccessBySlug } from '@/lib/data/universes';
import { getSupabaseServerAuthClient } from '@/lib/supabase/server';
import type { CreateUserNoteInput, NoteFilters, UpdateUserNoteInput, UserNote } from '@/lib/notes/types';

function clampText(value: string, max = 800) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? normalized.slice(0, max) : normalized;
}

function sanitizeTags(tags: string[] | undefined) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function mapRow(row: {
  id: string;
  universe_id: string;
  user_id: string;
  kind: 'highlight' | 'note';
  title: string | null;
  text: string;
  source_type: string;
  source_id: string | null;
  source_meta: Record<string, unknown> | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}): UserNote {
  return {
    id: row.id,
    universeId: row.universe_id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    text: row.text,
    sourceType: row.source_type as UserNote['sourceType'],
    sourceId: row.source_id,
    sourceMeta: (row.source_meta ?? {}) as Record<string, unknown>,
    tags: (row.tags ?? []) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getNotesContext(universeSlug: string) {
  const session = await getCurrentSession();
  if (!session || session.userId === 'dev-bypass') return null;
  const auth = await getSupabaseServerAuthClient();
  if (!auth) return null;
  const access = await getUniverseAccessBySlug(universeSlug);
  if (!access.universe) return null;
  if (!access.published && !access.canPreview) return null;
  return { auth, session, universe: access.universe };
}

export async function listUserNotes(input: {
  universeSlug: string;
  filters?: NoteFilters;
}): Promise<{ items: UserNote[]; nextCursor: number | null }> {
  const ctx = await getNotesContext(input.universeSlug);
  if (!ctx) return { items: [], nextCursor: null };
  const filters = input.filters ?? {};
  const limit = Math.max(1, Math.min(80, filters.limit ?? 30));
  const cursor = Math.max(0, filters.cursor ?? 0);
  let query = ctx.auth
    .from('user_notes')
    .select('id, universe_id, user_id, kind, title, text, source_type, source_id, source_meta, tags, created_at, updated_at')
    .eq('universe_id', ctx.universe.id)
    .eq('user_id', ctx.session.userId)
    .order('created_at', { ascending: false })
    .range(cursor, cursor + limit + 80);
  if (filters.kind && filters.kind !== 'all') query = query.eq('kind', filters.kind);
  if (filters.sourceType && filters.sourceType !== 'all') query = query.eq('source_type', filters.sourceType);
  if (filters.q?.trim()) query = query.or(`title.ilike.%${filters.q.trim()}%,text.ilike.%${filters.q.trim()}%`);
  const { data } = await query;
  const filtered = ((data ?? []) as Array<Parameters<typeof mapRow>[0]>).filter((row) => {
    if (!filters.tags || filters.tags.length === 0) return true;
    const set = new Set((row.tags ?? []).map((tag) => tag.toLowerCase()));
    return filters.tags.some((tag) => set.has(tag.toLowerCase()));
  });
  const items = filtered.slice(0, limit).map(mapRow);
  return {
    items,
    nextCursor: filtered.length > limit ? cursor + limit : null,
  };
}

export async function createUserNote(input: CreateUserNoteInput): Promise<UserNote | null> {
  const ctx = await getNotesContext(input.universeSlug);
  if (!ctx) return null;
  const text = clampText(input.text);
  if (!text) return null;
  const { data } = await ctx.auth
    .from('user_notes')
    .insert({
      universe_id: ctx.universe.id,
      user_id: ctx.session.userId,
      kind: input.kind,
      title: input.title?.trim() ? input.title.trim().slice(0, 160) : null,
      text,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      source_meta: input.sourceMeta ?? {},
      tags: sanitizeTags(input.tags),
    })
    .select('id, universe_id, user_id, kind, title, text, source_type, source_id, source_meta, tags, created_at, updated_at')
    .maybeSingle();
  if (!data) return null;
  return mapRow(data as Parameters<typeof mapRow>[0]);
}

export async function updateUserNote(input: {
  universeSlug: string;
  patch: UpdateUserNoteInput;
}): Promise<UserNote | null> {
  const ctx = await getNotesContext(input.universeSlug);
  if (!ctx) return null;
  const payload: Record<string, unknown> = {};
  if (typeof input.patch.title !== 'undefined') {
    payload.title = input.patch.title?.trim() ? input.patch.title.trim().slice(0, 160) : null;
  }
  if (typeof input.patch.text === 'string') payload.text = clampText(input.patch.text);
  if (Array.isArray(input.patch.tags)) payload.tags = sanitizeTags(input.patch.tags);
  if (Object.keys(payload).length === 0) return null;
  const { data } = await ctx.auth
    .from('user_notes')
    .update(payload)
    .eq('id', input.patch.id)
    .eq('universe_id', ctx.universe.id)
    .eq('user_id', ctx.session.userId)
    .select('id, universe_id, user_id, kind, title, text, source_type, source_id, source_meta, tags, created_at, updated_at')
    .maybeSingle();
  if (!data) return null;
  return mapRow(data as Parameters<typeof mapRow>[0]);
}

export async function deleteUserNote(input: { universeSlug: string; id: string }) {
  const ctx = await getNotesContext(input.universeSlug);
  if (!ctx) return false;
  const { error } = await ctx.auth
    .from('user_notes')
    .delete()
    .eq('id', input.id)
    .eq('universe_id', ctx.universe.id)
    .eq('user_id', ctx.session.userId);
  return !error;
}

export async function upsertImportedNotes(input: {
  universeSlug: string;
  notes: Array<{
    kind: UserNote['kind'];
    title: string | null;
    text: string;
    sourceType: UserNote['sourceType'];
    sourceId: string | null;
    sourceMeta: Record<string, unknown>;
    tags: string[];
  }>;
}) {
  const ctx = await getNotesContext(input.universeSlug);
  if (!ctx) return [] as UserNote[];
  const payload = input.notes
    .map((note) => ({
      universe_id: ctx.universe.id,
      user_id: ctx.session.userId,
      kind: note.kind,
      title: note.title?.trim() ? note.title.trim().slice(0, 160) : null,
      text: clampText(note.text),
      source_type: note.sourceType,
      source_id: note.sourceId ?? null,
      source_meta: note.sourceMeta ?? {},
      tags: sanitizeTags(note.tags),
    }))
    .filter((note) => Boolean(note.text))
    .slice(0, 80);
  if (payload.length === 0) return [];
  const { data } = await ctx.auth
    .from('user_notes')
    .insert(payload)
    .select('id, universe_id, user_id, kind, title, text, source_type, source_id, source_meta, tags, created_at, updated_at');
  return ((data ?? []) as Array<Parameters<typeof mapRow>[0]>).map(mapRow);
}
