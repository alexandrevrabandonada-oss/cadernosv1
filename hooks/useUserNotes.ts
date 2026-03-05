'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import type { CreateUserNoteInput, NoteSourceType, UserNote } from '@/lib/notes/types';

type UseUserNotesInput = {
  universeSlug: string;
};

type FilterInput = {
  kind?: 'all' | 'highlight' | 'note';
  sourceType?: 'all' | NoteSourceType;
  tags?: string[];
  q?: string;
};

function storageKey(slug: string) {
  return `cv:user-notes:v1:${slug}`;
}

function normalizeText(value: string, max = 800) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? normalized.slice(0, max) : normalized;
}

function normalizeTags(tags: string[] | undefined) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function stableHash(input: Pick<UserNote, 'kind' | 'sourceType' | 'sourceId' | 'text' | 'title'>) {
  const base = [input.kind, input.sourceType, input.sourceId ?? '', input.title ?? '', input.text].join('::');
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  return String(hash);
}

function readLocal(slug: string) {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return [] as UserNote[];
    const parsed = JSON.parse(raw) as UserNote[];
    if (!Array.isArray(parsed)) return [] as UserNote[];
    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [] as UserNote[];
  }
}

function writeLocal(slug: string, notes: UserNote[]) {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(notes.slice(0, 300)));
  } catch {}
}

function dedupe(notes: UserNote[]) {
  const seen = new Set<string>();
  return notes.filter((item) => {
    const key = item.id.startsWith('local-') ? stableHash(item) : item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useUserNotes({ universeSlug }: UseUserNotesInput) {
  const prefs = useUiPrefsContext();
  const isLoggedIn = Boolean(prefs?.isLoggedIn);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const local = readLocal(universeSlug);
    setNotes(local);
    setLoading(false);
    if (!isLoggedIn) return;
    const loadRemote = async () => {
      try {
        const response = await fetch(`/api/notes?universeSlug=${encodeURIComponent(universeSlug)}&limit=80`, { method: 'GET' });
        if (!response.ok) return;
        const payload = (await response.json()) as { items?: UserNote[] };
        const merged = dedupe([...(payload.items ?? []), ...local]);
        if (!mounted) return;
        setNotes(merged);
        writeLocal(universeSlug, merged);

        const pending = merged.filter((item) => item.pendingSync || item.id.startsWith('local-'));
        if (pending.length > 0) {
          const syncResponse = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sync',
              universeSlug,
              notes: pending,
            }),
          });
          if (syncResponse.ok) {
            const syncedPayload = (await syncResponse.json()) as { synced?: UserNote[] };
            const stable = dedupe([...(syncedPayload.synced ?? []), ...merged.map((item) => ({ ...item, pendingSync: false }))]);
            if (!mounted) return;
            setNotes(stable);
            writeLocal(universeSlug, stable);
          }
        }
      } catch {
        // offline fallback
      }
    };
    void loadRemote();
    return () => {
      mounted = false;
    };
  }, [isLoggedIn, universeSlug]);

  const createNote = useCallback(
    async (input: Omit<CreateUserNoteInput, 'universeSlug'>) => {
      const draft: UserNote = {
        id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        universeSlug,
        universeId: '',
        kind: input.kind,
        title: input.title?.trim() ? input.title.trim().slice(0, 160) : null,
        text: normalizeText(input.text),
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        sourceMeta: input.sourceMeta ?? {},
        tags: normalizeTags(input.tags),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingSync: isLoggedIn,
      };
      if (!draft.text) return null;
      const nextLocal = dedupe([draft, ...notes]);
      setNotes(nextLocal);
      writeLocal(universeSlug, nextLocal);
      setError(null);

      if (!isLoggedIn) return draft;
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            universeSlug,
            ...input,
            text: draft.text,
            title: draft.title,
            tags: draft.tags,
          }),
        });
        if (!response.ok) return draft;
        const payload = (await response.json()) as { note?: UserNote };
        if (!payload.note) return draft;
        const merged = dedupe([payload.note, ...nextLocal.filter((item) => item.id !== draft.id)]);
        setNotes(merged);
        writeLocal(universeSlug, merged);
        return payload.note;
      } catch {
        return draft;
      }
    },
    [isLoggedIn, notes, universeSlug],
  );

  const updateNote = useCallback(
    async (id: string, patch: { title?: string | null; text?: string; tags?: string[] }) => {
      const nextLocal = notes.map((item) =>
        item.id === id
          ? {
              ...item,
              title: typeof patch.title !== 'undefined' ? (patch.title?.trim() ? patch.title.trim().slice(0, 160) : null) : item.title,
              text: typeof patch.text === 'string' ? normalizeText(patch.text) : item.text,
              tags: Array.isArray(patch.tags) ? normalizeTags(patch.tags) : item.tags,
              updatedAt: new Date().toISOString(),
              pendingSync: isLoggedIn ? true : item.pendingSync,
            }
          : item,
      );
      setNotes(nextLocal);
      writeLocal(universeSlug, nextLocal);
      if (!isLoggedIn || id.startsWith('local-')) return true;
      try {
        const response = await fetch('/api/notes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ universeSlug, id, ...patch }),
        });
        if (!response.ok) return false;
        const payload = (await response.json()) as { note?: UserNote };
        if (payload.note) {
          const merged = notes.map((item) => (item.id === id ? payload.note! : item));
          setNotes(merged);
          writeLocal(universeSlug, merged);
        }
        return true;
      } catch {
        return false;
      }
    },
    [isLoggedIn, notes, universeSlug],
  );

  const deleteNoteById = useCallback(
    async (id: string) => {
      const nextLocal = notes.filter((item) => item.id !== id);
      setNotes(nextLocal);
      writeLocal(universeSlug, nextLocal);
      if (!isLoggedIn || id.startsWith('local-')) return true;
      try {
        await fetch('/api/notes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ universeSlug, id }),
        });
      } catch {}
      return true;
    },
    [isLoggedIn, notes, universeSlug],
  );

  const filtered = useCallback(
    (input: FilterInput) => {
      const tags = normalizeTags(input.tags);
      const q = input.q?.trim().toLowerCase() ?? '';
      return notes.filter((item) => {
        if (input.kind && input.kind !== 'all' && item.kind !== input.kind) return false;
        if (input.sourceType && input.sourceType !== 'all' && item.sourceType !== input.sourceType) return false;
        if (tags.length > 0) {
          const noteTags = new Set(item.tags.map((tag) => tag.toLowerCase()));
          if (!tags.some((tag) => noteTags.has(tag))) return false;
        }
        if (q) {
          const hay = `${item.title ?? ''} ${item.text}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },
    [notes],
  );

  const tagPool = useMemo(
    () => Array.from(new Set(notes.flatMap((item) => item.tags))).slice(0, 40),
    [notes],
  );

  return {
    loading,
    notes,
    error,
    isLoggedIn,
    tagPool,
    createNote,
    updateNote,
    deleteNote: deleteNoteById,
    filterNotes: filtered,
  };
}
