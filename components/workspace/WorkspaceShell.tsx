'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { Carimbo } from '@/components/ui/Badge';
import { DockNav } from '@/components/workspace/DockNav';
import { DetailPanel } from '@/components/workspace/DetailPanel';
import { useWorkspacePanels } from '@/components/workspace/useWorkspacePanels';
import { buildUniverseHref } from '@/lib/universeNav';

type WorkspaceShellProps = {
  slug: string;
  section: 'provas' | 'linha' | 'debate';
  title?: string;
  subtitle?: string;
  filter: ReactNode;
  children: ReactNode;
  detail: ReactNode;
  detailTitle?: string;
  selectedId?: string;
  preview?: boolean;
};

export function WorkspaceShell({
  slug,
  section,
  title,
  subtitle,
  filter,
  children,
  detail,
  detailTitle = 'Detalhes',
  selectedId = '',
  preview = false,
}: WorkspaceShellProps) {
  const panels = useWorkspacePanels();
  const hasDetail = Boolean(selectedId);
  const detailOpen = panels.detailOpen && hasDetail;
  const sectionLabel = title ?? section.toUpperCase();

  useEffect(() => {
    if (!panels.filtersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        panels.closeFilters();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panels]);

  return (
    <section className='workspace-shell stack'>
      <header className='workspace-head'>
        <div>
          <h2 className='ui-section-title' style={{ margin: 0 }}>
            {sectionLabel}
          </h2>
          {subtitle ? (
            <p className='muted' style={{ margin: 0 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className='toolbar-row'>
          {preview ? <Carimbo>Preview</Carimbo> : null}
          <button type='button' className='ui-button mobile-only' onClick={panels.openFilters} aria-label='Abrir filtros'>
            Filtros
          </button>
          <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, '')}>
            Voltar ao Hub
          </Link>
        </div>
      </header>

      <div className='workspace-grid'>
        <aside className='workspace-filter desktop-only' aria-label='Filtros'>
          {filter}
        </aside>

        <section className='workspace-content' aria-label='Conteudo principal'>
          {children}
        </section>

        <DetailPanel
          title={detailTitle}
          mobileOpen={detailOpen}
          onCloseMobile={panels.closeDetail}
          empty={
            <p className='muted' style={{ margin: 0 }}>
              Selecione um item para ver detalhes.
            </p>
          }
        >
          {hasDetail ? detail : null}
        </DetailPanel>
      </div>

      <div className={`workspace-drawer-overlay ${panels.filtersOpen ? 'is-open' : ''}`} onClick={panels.closeFilters} aria-hidden='true' />
      <aside className={`workspace-drawer ${panels.filtersOpen ? 'is-open' : ''}`} role='dialog' aria-modal='true' aria-label='Filtros'>
        <header className='workspace-detail-head'>
          <strong>Filtros</strong>
          <button type='button' className='ui-button' data-variant='ghost' onClick={panels.closeFilters} aria-label='Fechar filtros'>
            Fechar
          </button>
        </header>
        <div className='workspace-drawer-body'>{filter}</div>
      </aside>

      <DockNav slug={slug} />
    </section>
  );
}
