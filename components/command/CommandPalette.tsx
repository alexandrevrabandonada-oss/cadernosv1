'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShortcuts } from '@/hooks/useShortcuts';
import { useUiPrefsContext } from '@/components/ui/UiPrefsProvider';
import { useWorkspaceContext } from '@/components/workspace/WorkspaceContext';
import { buildUniverseHref } from '@/lib/universeNav';

type PaletteNode = { id: string; slug: string; title: string };
type PaletteTerm = { id: string; slug: string; term: string };
type PaletteResponse = {
  nodes: PaletteNode[];
  terms: PaletteTerm[];
};

type PaletteItem = {
  id: string;
  label: string;
  subtitle: string;
  href: string;
};

const SECTION_ITEMS = [
  { id: 'sec-mapa', label: 'Ir para Mapa', subtitle: 'Explorar nos e clusters', path: 'mapa' },
  { id: 'sec-provas', label: 'Ir para Provas', subtitle: 'Evidencias e trechos', path: 'provas' },
  { id: 'sec-caderno', label: 'Ir para Meu Caderno', subtitle: 'Highlights e notas', path: 'meu-caderno' },
  { id: 'sec-linha', label: 'Ir para Linha', subtitle: 'Timeline e eventos', path: 'linha' },
  { id: 'sec-debate', label: 'Ir para Debate', subtitle: 'Perguntas e respostas', path: 'debate' },
  { id: 'sec-glossario', label: 'Ir para Glossario', subtitle: 'Conceitos do universo', path: 'glossario' },
  { id: 'sec-trilhas', label: 'Ir para Trilhas', subtitle: 'Percursos guiados', path: 'trilhas' },
  { id: 'sec-tutor', label: 'Ir para Tutor', subtitle: 'Sessao de estudo', path: 'tutor' },
];

function useDebouncedValue(value: string, delayMs = 160) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

export function CommandPalette({ universeSlug }: { universeSlug: string }) {
  const router = useRouter();
  const workspace = useWorkspaceContext();
  const uiPrefs = useUiPrefsContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [payload, setPayload] = useState<PaletteResponse>({ nodes: [], terms: [] });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const debouncedQuery = useDebouncedValue(query);
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

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const url = `/api/palette?universeSlug=${encodeURIComponent(universeSlug)}&q=${encodeURIComponent(debouncedQuery)}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          setPayload({ nodes: [], terms: [] });
          return;
        }
        const data = (await response.json()) as PaletteResponse;
        setPayload({
          nodes: data.nodes ?? [],
          terms: data.terms ?? [],
        });
      } catch {
        setPayload({ nodes: [], terms: [] });
      }
    };
    void run();
    return () => controller.abort();
  }, [debouncedQuery, open, universeSlug]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const baseSections = SECTION_ITEMS.filter((item) =>
      q ? `${item.label} ${item.subtitle}`.toLowerCase().includes(q) : true,
    ).map((item) => ({
      id: item.id,
      label: item.label,
      subtitle: item.subtitle,
      href: buildUniverseHref(universeSlug, item.path),
    }));

    const nodeItems = payload.nodes.map((node) => ({
      id: `node-${node.id}`,
      label: `No: ${node.title}`,
      subtitle: 'Abrir no mapa com detalhe',
      href: `${buildUniverseHref(universeSlug, 'mapa')}?node=${encodeURIComponent(node.slug)}&panel=detail`,
    }));
    const termItems = payload.terms.map((term) => ({
      id: `term-${term.id}`,
      label: `Termo: ${term.term}`,
      subtitle: 'Abrir no glossario',
      href: `${buildUniverseHref(universeSlug, 'glossario')}?selected=${encodeURIComponent(term.id)}&panel=detail`,
    }));
    return [...baseSections, ...nodeItems, ...termItems].slice(0, 24);
  }, [payload.nodes, payload.terms, query, universeSlug]);

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
        // trap simples de foco no modal
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
      <div className='command-modal' role='dialog' aria-modal='true' aria-label='Command palette' ref={panelRef}>
        <header className='workspace-detail-head'>
          <strong>Navegacao rapida do universo</strong>
          <button type='button' className='ui-button' data-variant='ghost' onClick={() => setOpen(false)} aria-label='Fechar palette'>
            Esc
          </button>
        </header>
        <div className='command-body stack'>
          <input
            ref={inputRef}
            className='command-input'
            placeholder='Digite secao, no ou termo...'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label='Buscar comando'
          />
          <ul className='command-list' role='listbox' aria-label='Resultados da command palette'>
            {items.map((item, index) => (
              <li key={item.id}>
                <button
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
                  <strong>{item.label}</strong>
                  <span className='muted'>{item.subtitle}</span>
                </button>
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
      </div>
    </>
  );
}
