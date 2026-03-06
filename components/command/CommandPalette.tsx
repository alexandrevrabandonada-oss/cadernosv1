'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useUserNotes } from '@/hooks/useUserNotes';
import { parseSearchQuery } from '@/lib/search/query';
import { type SearchResponse, type SearchResult, SEARCH_TYPES, type SearchType } from '@/lib/search/types';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { useWorkspaceContext } from '@/components/workspace/WorkspaceContext';
import { buildUniverseHref } from '@/lib/universeNav';

type PaletteItem = SearchResult & {
  groupLabel: string;
};

const TYPE_LABELS: Record<SearchType, string> = {
  node: 'Nos',
  term: 'Glossario',
  doc: 'Docs',
  evidence: 'Provas',
  event: 'Linha',
  thread: 'Debate',
  note: 'Meu Caderno',
};

const TYPE_CHIPS: Array<{ type: SearchType; label: string }> = [
  { type: 'node', label: 'Nos' },
  { type: 'term', label: 'Termos' },
  { type: 'doc', label: 'Docs' },
  { type: 'evidence', label: 'Provas' },
  { type: 'event', label: 'Linha' },
  { type: 'thread', label: 'Debate' },
  { type: 'note', label: 'Meu Caderno' },
];

const SECTION_ITEMS = [
  { id: 'sec-mapa', title: 'Ir para Mapa', subtitle: 'Explorar nos e clusters', href: (slug: string) => buildUniverseHref(slug, 'mapa') },
  { id: 'sec-provas', title: 'Ir para Provas', subtitle: 'Evidencias e trechos', href: (slug: string) => buildUniverseHref(slug, 'provas') },
  { id: 'sec-caderno', title: 'Ir para Meu Caderno', subtitle: 'Highlights e notas', href: (slug: string) => buildUniverseHref(slug, 'meu-caderno') },
  { id: 'sec-linha', title: 'Ir para Linha', subtitle: 'Timeline e eventos', href: (slug: string) => buildUniverseHref(slug, 'linha') },
  { id: 'sec-debate', title: 'Ir para Debate', subtitle: 'Perguntas e respostas', href: (slug: string) => buildUniverseHref(slug, 'debate') },
  { id: 'sec-glossario', title: 'Ir para Glossario', subtitle: 'Conceitos do universo', href: (slug: string) => buildUniverseHref(slug, 'glossario') },
];

function useDebouncedValue(value: string, delayMs = 180) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

function clip(value: string, max = 150) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function buildLocalNoteHref(slug: string, note: ReturnType<typeof useUserNotes>['notes'][number]) {
  if (note.sourceType === 'evidence' && note.sourceId) return `${buildUniverseHref(slug, 'provas')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'thread' && note.sourceId) return `${buildUniverseHref(slug, 'debate')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'event' && note.sourceId) return `${buildUniverseHref(slug, 'linha')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'term' && note.sourceId) return `${buildUniverseHref(slug, 'glossario')}?selected=${note.sourceId}&panel=detail`;
  if (note.sourceType === 'node') {
    const nodeSlug = typeof note.sourceMeta?.nodeSlug === 'string' ? note.sourceMeta.nodeSlug : '';
    if (nodeSlug) return `${buildUniverseHref(slug, 'mapa')}?node=${encodeURIComponent(nodeSlug)}&panel=detail`;
  }
  if (note.sourceType === 'citation' || note.sourceType === 'doc' || note.sourceType === 'chunk') {
    const docId = typeof note.sourceMeta?.docId === 'string' ? note.sourceMeta.docId : '';
    const pageStart = typeof note.sourceMeta?.pageStart === 'number' ? note.sourceMeta.pageStart : null;
    const pageHint = typeof note.sourceMeta?.pageHint === 'string' ? note.sourceMeta.pageHint : '';
    if (docId) {
      const qs = new URLSearchParams();
      if (pageStart) qs.set('p', String(pageStart));
      if (pageHint && !pageStart) qs.set('p', pageHint.replace(/^p\./, ''));
      qs.set('hl', note.id);
      return `${buildUniverseHref(slug, `doc/${docId}`)}?${qs.toString()}`;
    }
  }
  return `${buildUniverseHref(slug, 'meu-caderno')}?selected=${note.id}&panel=detail`;
}

function groupedLabel(type: SearchType) {
  return TYPE_LABELS[type];
}

export function CommandPalette({ universeSlug }: { universeSlug: string }) {
  const router = useRouter();
  const workspace = useWorkspaceContext();
  const uiPrefs = useUiPrefsContext();
  const { notes, isLoggedIn } = useUserNotes({ universeSlug });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<SearchType[]>([...SEARCH_TYPES]);
  const [payload, setPayload] = useState<SearchResponse>({ results: [], meta: { countsByType: {} } });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const debouncedQuery = useDebouncedValue(query);
  const parsed = useMemo(() => parseSearchQuery(query), [query]);
  const closePanels = workspace?.closePanels ?? (() => {});

  useShortcuts({
    universeSlug,
    isPaletteOpen: open,
    openPalette: () => setOpen(true),
    closePalette: () => setOpen(false),
    closePanels,
    toggleFocusMode: () => uiPrefs?.toggleFocusMode(),
    enabled: true,
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-palette-open', open ? '1' : '0');
    return () => document.documentElement.setAttribute('data-palette-open', '0');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const effectiveTypes = useMemo<SearchType[]>(() => {
    if (parsed.notesOnly) return ['note'];
    return selectedTypes.length > 0 ? selectedTypes : [...SEARCH_TYPES];
  }, [parsed.notesOnly, selectedTypes]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const url = `/api/search?u=${encodeURIComponent(universeSlug)}&q=${encodeURIComponent(debouncedQuery)}&types=${encodeURIComponent(effectiveTypes.join(','))}&limit=20`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          setPayload({ results: [], meta: { countsByType: {} } });
          return;
        }
        const data = (await response.json()) as SearchResponse;
        setPayload({
          results: data.results ?? [],
          meta: { countsByType: data.meta?.countsByType ?? {} },
        });
      } catch {
        setPayload({ results: [], meta: { countsByType: {} } });
      }
    };
    void run();
    return () => controller.abort();
  }, [debouncedQuery, effectiveTypes, open, universeSlug]);

  const localNoteResults = useMemo<SearchResult[]>(() => {
    if (!effectiveTypes.includes('note')) return [];
    const noteQuery = parsed.normalizedText;
    return notes
      .filter((note) => {
        if (parsed.tags.length > 0) {
          const tags = note.tags.map((tag) => tag.toLowerCase());
          if (!parsed.tags.some((tag) => tags.includes(tag))) return false;
        }
        if (!noteQuery) return true;
        const hay = `${note.title ?? ''} ${note.text}`.toLowerCase();
        return hay.includes(noteQuery);
      })
      .slice(0, 6)
      .map((note) => ({
        type: 'note' as const,
        id: note.id,
        title: note.title || (note.kind === 'highlight' ? 'Highlight privado' : 'Nota privada'),
        subtitle: !isLoggedIn ? 'Meu Caderno local' : note.kind === 'highlight' ? 'Meu Caderno • highlight' : 'Meu Caderno • nota',
        snippet: clip(note.text),
        href: buildLocalNoteHref(universeSlug, note),
        badges: !isLoggedIn ? ['local'] : ['privada'],
        tags: note.tags,
      }));
  }, [effectiveTypes, isLoggedIn, notes, parsed.normalizedText, parsed.tags, universeSlug]);

  const quickResults = useMemo<SearchResult[]>(() => {
    if (query.trim()) {
      if (parsed.notesOnly || effectiveTypes.length === 1 && effectiveTypes[0] === 'note') {
        const qs = new URLSearchParams();
        if (parsed.text) qs.set('q', parsed.text);
        if (parsed.tags.length > 0) qs.set('tags', parsed.tags.join(','));
        return [{
          type: 'note',
          id: 'jump-notebook',
          title: 'Abrir Meu Caderno filtrado',
          subtitle: parsed.tags.length > 0 ? `Tags: ${parsed.tags.join(', ')}` : 'Pular direto para seus highlights e notas',
          snippet: parsed.text || 'Abrir caderno com os filtros atuais da busca.',
          href: `${buildUniverseHref(universeSlug, 'meu-caderno')}${qs.toString() ? `?${qs.toString()}` : ''}`,
          badges: ['jump'],
          tags: parsed.tags,
        }];
      }
      return [];
    }

    return SECTION_ITEMS.map((item) => ({
      type: 'node',
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      snippet: '',
      href: item.href(universeSlug),
      badges: ['jump'],
      tags: [],
    }));
  }, [effectiveTypes, parsed.notesOnly, parsed.tags, parsed.text, query, universeSlug]);

  const items = useMemo<PaletteItem[]>(() => {
    const merged = [...quickResults, ...payload.results, ...localNoteResults];
    const seen = new Set<string>();
    return merged
      .filter((item) => {
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({ ...item, groupLabel: groupedLabel(item.type) }));
  }, [localNoteResults, payload.results, quickResults]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const current = groups.get(item.groupLabel) ?? [];
      current.push(item);
      groups.set(item.groupLabel, current);
    }
    return Array.from(groups.entries());
  }, [items]);

  const selectedItem = items[cursor] ?? null;

  useEffect(() => {
    if (cursor >= items.length) setCursor(0);
  }, [cursor, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCursor((current) => (items.length > 0 ? (current + 1) % items.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCursor((current) => (items.length > 0 ? (current - 1 + items.length) % items.length : 0));
      } else if (event.key === 'Enter') {
        const target = items[cursor];
        if (!target) return;
        event.preventDefault();
        setOpen(false);
        router.push(target.href);
      } else if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = panel.querySelectorAll<HTMLElement>('button,[href],input,[tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cursor, items, open, router]);

  if (!open) return null;

  return (
    <>
      <div className='command-overlay' onClick={() => setOpen(false)} aria-hidden='true' />
      <div className='command-modal command-modal-wide' role='dialog' aria-modal='true' aria-label='Command palette' ref={panelRef}>
        <header className='workspace-detail-head'>
          <strong>Busca universal do universo</strong>
          <button type='button' className='ui-button' data-variant='ghost' onClick={() => setOpen(false)} aria-label='Fechar palette'>
            Esc
          </button>
        </header>
        <div className='command-body stack'>
          <input
            ref={inputRef}
            className='command-input'
            placeholder='Busque tudo: no, termo, doc, prova, event, thread, @notas, #tag'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label='Buscar comando'
          />

          <div className='command-chip-row' aria-label='Filtros da busca'>
            {TYPE_CHIPS.map((chip) => {
              const forced = parsed.notesOnly && chip.type === 'note';
              const active = forced || effectiveTypes.includes(chip.type);
              return (
                <button
                  key={chip.type}
                  type='button'
                  className='command-chip'
                  data-active={active ? '1' : '0'}
                  disabled={parsed.notesOnly && chip.type !== 'note'}
                  onClick={() => {
                    if (parsed.notesOnly) return;
                    setSelectedTypes((current) => {
                      if (current.includes(chip.type)) return current.filter((item) => item !== chip.type);
                      return [...current, chip.type];
                    });
                  }}
                >
                  <span>{chip.label}</span>
                  <small>{payload.meta.countsByType[chip.type] ?? (chip.type === 'note' ? localNoteResults.length : 0)}</small>
                </button>
              );
            })}
          </div>

          <div className='command-grid'>
            <div className='command-results'>
              <ul className='command-list' role='listbox' aria-label='Resultados da command palette'>
                {groupedItems.map(([group, groupItems]) => (
                  <li key={group} className='command-group'>
                    <p className='command-group-title'>{group}</p>
                    <div className='stack' style={{ gap: '0.45rem' }}>
                      {groupItems.map((item) => {
                        const index = items.findIndex((entry) => entry.id === item.id && entry.type === item.type);
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            type='button'
                            className='command-item'
                            data-active={cursor === index ? '1' : undefined}
                            onMouseEnter={() => setCursor(index)}
                            onClick={() => {
                              setOpen(false);
                              router.push(item.href);
                            }}
                            role='option'
                            aria-selected={cursor === index}
                          >
                            <strong>{item.title}</strong>
                            <span className='muted'>{item.subtitle}</span>
                            {item.snippet ? <span className='command-snippet'>{item.snippet}</span> : null}
                            {item.badges?.length ? (
                              <span className='command-badges'>
                                {item.badges.map((badge) => (
                                  <small key={badge}>{badge}</small>
                                ))}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
                {items.length === 0 ? (
                  <li>
                    <p className='muted' style={{ margin: 0 }}>
                      Sem resultados para este termo.
                    </p>
                  </li>
                ) : null}
              </ul>
            </div>

            <aside className='command-preview surface-panel'>
              <p className='command-group-title'>Preview</p>
              {selectedItem ? (
                <div className='stack' style={{ gap: '0.55rem' }}>
                  <strong>{selectedItem.title}</strong>
                  <span className='muted'>{selectedItem.subtitle}</span>
                  {selectedItem.snippet ? <p style={{ margin: 0 }}>{selectedItem.snippet}</p> : null}
                  {selectedItem.badges?.length ? (
                    <div className='command-badges'>
                      {selectedItem.badges.map((badge) => (
                        <small key={badge}>{badge}</small>
                      ))}
                    </div>
                  ) : null}
                  <p className='muted' style={{ margin: 0 }}>Enter abre o item. / abre a palette. @ busca no Meu Caderno. # filtra tags.</p>
                </div>
              ) : (
                <p className='muted' style={{ margin: 0 }}>Digite para buscar em nodes, termos, docs, provas, events, threads e no seu Meu Caderno.</p>
              )}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
