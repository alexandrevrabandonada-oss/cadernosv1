import { NextResponse } from 'next/server';
import type { CreateUserNoteInput, NoteKind, NoteSourceType, UpdateUserNoteInput, UserNote } from '@/lib/notes/types';
import { createUserNote, deleteUserNote, listUserNotes, updateUserNote, upsertImportedNotes } from '@/lib/notes/notes';

function parseKind(value: unknown): NoteKind | null {
  return value === 'highlight' || value === 'note' ? value : null;
}

function parseSourceType(value: unknown): NoteSourceType | null {
  const valid: NoteSourceType[] = ['evidence', 'thread', 'citation', 'chunk', 'doc', 'event', 'term', 'node'];
  if (typeof value !== 'string') return null;
  return valid.includes(value as NoteSourceType) ? (value as NoteSourceType) : null;
}

function sanitizeCreate(body: unknown): CreateUserNoteInput | null {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const universeSlug = typeof source.universeSlug === 'string' ? source.universeSlug.trim() : '';
  const kind = parseKind(source.kind);
  const sourceType = parseSourceType(source.sourceType);
  const text = typeof source.text === 'string' ? source.text.trim() : '';
  if (!universeSlug || !kind || !sourceType || text.length === 0) return null;
  return {
    universeSlug,
    kind,
    title: typeof source.title === 'string' ? source.title : null,
    text,
    sourceType,
    sourceId: typeof source.sourceId === 'string' ? source.sourceId : null,
    sourceMeta: source.sourceMeta && typeof source.sourceMeta === 'object' ? (source.sourceMeta as Record<string, unknown>) : {},
    tags: Array.isArray(source.tags) ? source.tags.map((item) => String(item)) : [],
  };
}

function sanitizeUpdate(body: unknown): { universeSlug: string; patch: UpdateUserNoteInput } | null {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const universeSlug = typeof source.universeSlug === 'string' ? source.universeSlug.trim() : '';
  const id = typeof source.id === 'string' ? source.id.trim() : '';
  if (!universeSlug || !id) return null;
  const patch: UpdateUserNoteInput = { id };
  if (typeof source.title === 'string' || source.title === null) patch.title = source.title as string | null;
  if (typeof source.text === 'string') patch.text = source.text;
  if (Array.isArray(source.tags)) patch.tags = source.tags.map((item) => String(item));
  return { universeSlug, patch };
}

function sanitizeDelete(body: unknown): { universeSlug: string; id: string } | null {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const universeSlug = typeof source.universeSlug === 'string' ? source.universeSlug.trim() : '';
  const id = typeof source.id === 'string' ? source.id.trim() : '';
  if (!universeSlug || !id) return null;
  return { universeSlug, id };
}

function sanitizeSync(body: unknown): { universeSlug: string; notes: Array<Omit<UserNote, 'universeId' | 'userId' | 'createdAt' | 'updatedAt'>> } | null {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const universeSlug = typeof source.universeSlug === 'string' ? source.universeSlug.trim() : '';
  if (!universeSlug || !Array.isArray(source.notes)) return null;
  const notes: Array<Omit<UserNote, 'universeId' | 'userId' | 'createdAt' | 'updatedAt'>> = [];
  for (const raw of source.notes) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!text) continue;
    notes.push({
      id: typeof item.id === 'string' ? item.id : `local-sync-${Math.random().toString(16).slice(2, 10)}`,
      universeSlug,
      kind: parseKind(item.kind) ?? 'highlight',
      title: typeof item.title === 'string' ? item.title : null,
      text,
      sourceType: parseSourceType(item.sourceType) ?? 'evidence',
      sourceId: typeof item.sourceId === 'string' ? item.sourceId : null,
      sourceMeta: item.sourceMeta && typeof item.sourceMeta === 'object' ? (item.sourceMeta as Record<string, unknown>) : {},
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
      pendingSync: false,
    });
  }
  return { universeSlug, notes };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const universeSlug = url.searchParams.get('universeSlug')?.trim() ?? '';
  if (!universeSlug) return NextResponse.json({ error: 'invalid_universe_slug' }, { status: 400 });
  const kind = parseKind(url.searchParams.get('kind'));
  const sourceType = parseSourceType(url.searchParams.get('sourceType'));
  const q = url.searchParams.get('q')?.trim() ?? '';
  const tags = (url.searchParams.get('tags') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const cursor = Math.max(0, Number(url.searchParams.get('cursor') ?? 0) || 0);
  const limit = Math.max(1, Math.min(80, Number(url.searchParams.get('limit') ?? 30) || 30));
  const result = await listUserNotes({
    universeSlug,
    filters: {
      kind: kind ?? 'all',
      sourceType: sourceType ?? 'all',
      q,
      tags,
      cursor,
      limit,
    },
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  if (source.action === 'sync') {
    const payload = sanitizeSync(body);
    if (!payload) return NextResponse.json({ error: 'invalid_sync_payload' }, { status: 400 });
    const synced = await upsertImportedNotes(payload);
    return NextResponse.json({ ok: true, synced });
  }
  const payload = sanitizeCreate(body);
  if (!payload) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const created = await createUserNote(payload);
  if (!created) return NextResponse.json({ error: 'unauthorized_or_failed' }, { status: 401 });
  return NextResponse.json({ ok: true, note: created });
}

export async function PATCH(request: Request) {
  const payload = sanitizeUpdate(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const updated = await updateUserNote(payload);
  if (!updated) return NextResponse.json({ error: 'not_found_or_unauthorized' }, { status: 404 });
  return NextResponse.json({ ok: true, note: updated });
}

export async function DELETE(request: Request) {
  const payload = sanitizeDelete(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const ok = await deleteUserNote(payload);
  if (!ok) return NextResponse.json({ error: 'not_found_or_unauthorized' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
