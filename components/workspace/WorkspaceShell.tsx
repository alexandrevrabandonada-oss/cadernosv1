'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { PageReadyMarker } from '@/components/nav/PageReadyMarker';
import { Carimbo } from '@/components/ui/Badge';
import { PreferencesDrawer } from '@/components/ui/PreferencesDrawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandIcon, type BrandIconName } from '@/components/brand/icons/BrandIcon';
import { DockNav } from '@/components/workspace/DockNav';
import { DetailPanel } from '@/components/workspace/DetailPanel';
import { SectionActionBar } from '@/components/workspace/SectionActionBar';
import { useWorkspaceContext } from '@/components/workspace/WorkspaceContext';
import { useWorkspacePanels } from '@/components/workspace/useWorkspacePanels';
import { buildUniverseHref } from '@/lib/universeNav';

type WorkspaceShellProps = {
  slug: string;
  section: 'provas' | 'linha' | 'debate' | 'trilhas' | 'glossario' | 'mapa' | 'caderno';
  title?: string;
  subtitle?: string;
  filter: ReactNode;
  children: ReactNode;
  detail: ReactNode;
  detailTitle?: string;
  selectedId?: string;
  preview?: boolean;
  headerActions?: ReactNode;
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
  headerActions,
}: WorkspaceShellProps) {
  const sectionIcons: Record<WorkspaceShellProps['section'], BrandIconName> = {
    provas: 'provas',
    linha: 'linha',
    debate: 'debate',
    trilhas: 'trilhas',
    glossario: 'glossario',
    mapa: 'mapa',
    caderno: 'caderno',
  };
  const panels = useWorkspacePanels();
  const workspace = useWorkspaceContext();
  const hasDetail = Boolean(selectedId);
  const detailOpen = panels.detailOpen && hasDetail;
  const sectionLabel = title ?? section.toUpperCase();
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    const timer = window.setTimeout(() => setDetailLoading(false), 140);
    return () => window.clearTimeout(timer);
  }, [selectedId]);

  useEffect(() => {
    workspace?.registerActions({
      closeDetail: panels.closeDetail,
      closeFilters: panels.closeFilters,
    });
    return () => workspace?.registerActions(null);
  }, [panels.closeDetail, panels.closeFilters, workspace]);

  useEffect(() => {
    if (!panels.filtersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        workspace?.closePanels();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panels.filtersOpen, workspace]);

  return (
    <section className='workspace-shell stack' data-testid='workspace' data-room={section}>
      <PageReadyMarker id={`workspace:${section}`} />
      <header className='workspace-head surface-panel'>
        <div className='workspace-head-copy'>
          <p className='workspace-kicker'>{section}</p>
          <h2 className='ui-section-title workspace-title-with-icon' style={{ margin: 0 }}>
            <BrandIcon name={sectionIcons[section]} size={18} tone='editorial' />
            {sectionLabel}
          </h2>
          {subtitle ? <p className='muted' style={{ margin: 0 }}>{subtitle}</p> : null}
        </div>
        <SectionActionBar ariaLabel='Acoes do workspace'>
          {headerActions}
          {preview ? <Carimbo>Preview</Carimbo> : null}
          <button type='button' className='ui-button mobile-only' style={{ minHeight: 46, height: 46 }} onClick={panels.openFilters} aria-label='Abrir filtros'>
            Filtros
          </button>
          <PreferencesDrawer compact />
          <Link className='ui-button' data-variant='ghost' href={buildUniverseHref(slug, '')}>
            Voltar ao Hub
          </Link>
        </SectionActionBar>
      </header>

      <div className={section === 'mapa' ? 'workspace-grid workspace-grid-map' : 'workspace-grid'}>
        <aside className='workspace-filter desktop-only surface-blade' aria-label='Filtros' data-testid='filter-rail' id={section === 'mapa' ? 'filtros-mapa' : undefined}>
          {filter}
        </aside>

        <section className='workspace-content surface-panel' aria-label='Conteudo principal'>
          {children}
        </section>

        <DetailPanel
          title={detailTitle}
          mobileOpen={detailOpen}
          onCloseMobile={panels.closeDetail}
          showSkeleton={detailLoading && hasDetail}
          empty={<EmptyState title='Selecione um item' description='Escolha um item no conteudo principal para abrir o detalhe contextual.' />}
        >
          {hasDetail ? detail : null}
        </DetailPanel>
      </div>

      <div className={`workspace-drawer-overlay cv-panel-exit ${panels.filtersOpen ? 'is-open' : ''}`} onClick={panels.closeFilters} aria-hidden='true' />
      <aside className={`workspace-drawer surface-blade cv-panel-enter ${panels.filtersOpen ? 'is-open' : ''}`} role='dialog' aria-modal='true' aria-label='Filtros' data-testid='filter-rail'>
        <header className='workspace-detail-head'>
          <strong>Filtros</strong>
          <SectionActionBar ariaLabel='Acoes do painel de filtros'>
            <PreferencesDrawer compact />
            <button type='button' className='ui-button' style={{ minHeight: 46, height: 46 }} data-variant='ghost' onClick={panels.closeFilters} aria-label='Fechar filtros'>
              Fechar
            </button>
          </SectionActionBar>
        </header>
        <div className='workspace-drawer-body'>{filter}</div>
      </aside>

      <DockNav slug={slug} />
    </section>
  );
}
